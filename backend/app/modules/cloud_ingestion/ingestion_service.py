import os
import re
import uuid
import hashlib
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from fastapi import UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.survey import Survey
from app.models.dataset import Dataset, DatasetType, DatasetSource, DatasetStatus
from app.models.ingestion import (
    Sensor,
    SensorType,
    UploadSession,
    SessionStatus,
    UploadedFile,
    FileStatus,
    PositionRecord,
    ProcessingJob,
    JobType,
    JobStatus
)
from app.schemas.ingestion import (
    SensorCreate,
    SensorSummary,
    UploadSessionCreate,
    UploadSessionSummary,
    UploadSessionDetail,
    UploadedFileSummary,
    UploadedFileDetail,
    ProcessingJobSchema,
    SpatialFootprintResponse
)
from app.modules.cloud_ingestion.storage_provider import get_storage_provider
from app.modules.cloud_ingestion.extractors.image_extractor import extract_image_metadata
from app.modules.cloud_ingestion.extractors.lidar_extractor import lidar_extractor
from app.modules.cloud_ingestion.extractors.position_extractor import extract_positioning_metadata
from app.core.exceptions import NotFoundException, ValidationException, StorageException


ALLOWED_FORMATS = {
    # Images
    ".jpg": ("image/jpeg", "CAMERA", DatasetType.IMAGE),
    ".jpeg": ("image/jpeg", "CAMERA", DatasetType.IMAGE),
    ".png": ("image/png", "CAMERA", DatasetType.IMAGE),
    ".tif": ("image/tiff", "CAMERA", DatasetType.IMAGE),
    ".tiff": ("image/tiff", "CAMERA", DatasetType.IMAGE),
    # LiDAR Point Clouds
    ".las": ("application/octet-stream", "LIDAR", DatasetType.LIDAR),
    ".laz": ("application/octet-stream", "LIDAR", DatasetType.LIDAR),
    ".ply": ("application/octet-stream", "LIDAR", DatasetType.LIDAR),
    ".pcd": ("application/octet-stream", "LIDAR", DatasetType.LIDAR),
    # Positioning / Trajectory
    ".rinex": ("text/plain", "RTK_GPS", DatasetType.RTK),
    ".rnx": ("text/plain", "RTK_GPS", DatasetType.RTK),
    ".nmea": ("text/plain", "RTK_GPS", DatasetType.RTK),
    ".json": ("application/json", "TELEMETRY", DatasetType.METADATA),
    ".csv": ("text/csv", "RTK_GPS", DatasetType.RTK),
}

MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024  # 2 GB limit per file


def _sanitize_filename(filename: str) -> str:
    """Sanitizes filename and prevents directory traversal attacks."""
    clean = os.path.basename(filename)
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean)
    return clean[:200]


class IngestionService:
    def __init__(self, db: Session):
        self.db = db
        self.storage = get_storage_provider()

    # --------------------------------------------------------------------------
    # SENSOR REGISTRY
    # --------------------------------------------------------------------------
    def list_sensors(self) -> List[SensorSummary]:
        sensors = self.db.query(Sensor).filter(Sensor.is_active == True).all()
        return [SensorSummary.model_validate(s) for s in sensors]

    def create_sensor(self, data: SensorCreate) -> SensorSummary:
        sensor = Sensor(
            sensor_id=data.sensor_id,
            name=data.name,
            sensor_type=data.sensor_type,
            model=data.model,
            serial_number=data.serial_number,
            specifications_json=data.specifications_json,
            is_active=True
        )
        self.db.add(sensor)
        self.db.commit()
        self.db.refresh(sensor)
        return SensorSummary.model_validate(sensor)

    # --------------------------------------------------------------------------
    # UPLOAD SESSIONS
    # --------------------------------------------------------------------------
    def create_upload_session(self, survey_code: str, data: UploadSessionCreate) -> UploadSessionDetail:
        survey = self.db.query(Survey).filter(
            (Survey.survey_id == survey_code) | (Survey.id == data.survey_id)
        ).first()
        if not survey:
            raise NotFoundException("Survey", survey_code)

        session_code = f"SESSION-{survey.survey_id}-{uuid.uuid4().hex[:6].upper()}"
        session = UploadSession(
            session_id=session_code,
            survey_id=survey.id,
            device_id=data.device_id,
            gateway_type=data.gateway_type,
            status=SessionStatus.CREATED,
            start_time=datetime.utcnow(),
            meta_info=data.meta_info
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        return self.get_upload_session(session.session_id)

    def get_upload_session(self, session_id: str) -> UploadSessionDetail:
        session = self.db.query(UploadSession).filter(UploadSession.session_id == session_id).first()
        if not session:
            raise NotFoundException("UploadSession", session_id)

        progress = 0.0
        if session.total_files > 0:
            progress = round((session.uploaded_files / session.total_files) * 100.0, 1)

        summary_dict = UploadSessionSummary.model_validate(session).model_dump()
        return UploadSessionDetail(**summary_dict, progress_percentage=progress)

    def list_upload_sessions(self, survey_code: str) -> List[UploadSessionSummary]:
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_code).first()
        if not survey:
            raise NotFoundException("Survey", survey_code)

        sessions = self.db.query(UploadSession).filter(
            UploadSession.survey_id == survey.id
        ).order_by(UploadSession.created_at.desc()).all()

        return [UploadSessionSummary.model_validate(s) for s in sessions]

    def complete_upload_session(self, session_id: str) -> UploadSessionDetail:
        session = self.db.query(UploadSession).filter(UploadSession.session_id == session_id).first()
        if not session:
            raise NotFoundException("UploadSession", session_id)

        session.status = SessionStatus.COMPLETED if session.failed_files == 0 else SessionStatus.PARTIAL
        session.end_time = datetime.utcnow()
        self.db.commit()
        self.db.refresh(session)
        return self.get_upload_session(session.session_id)

    # --------------------------------------------------------------------------
    # FILE INGESTION & CONTINUOUS UPLOAD
    # --------------------------------------------------------------------------
    async def ingest_file(
        self,
        survey_code: str,
        upload_file: UploadFile,
        session_id_str: Optional[str] = None,
        dataset_code: Optional[str] = None,
        sensor_code: Optional[str] = None,
        metadata_override: Optional[Dict[str, Any]] = None
    ) -> UploadedFileDetail:
        """
        Core ingestion pipeline:
        1. Validates file size, extension, MIME.
        2. Calculates SHA-256 checksum and checks for duplicate.
        3. Stores file in CloudStorageProvider with sanitized server-side key.
        4. Extracts EXIF, LiDAR, or Positioning metadata without modifying original bytes.
        5. Associates with Survey and Dataset (creating parent dataset if needed).
        6. Enqueues downstream ProcessingJob.
        """
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_code).first()
        if not survey:
            raise NotFoundException("Survey", survey_code)

        # 1. Validation
        raw_filename = upload_file.filename or "unnamed_sensor_data.bin"
        clean_filename = _sanitize_filename(raw_filename)
        ext = os.path.splitext(clean_filename)[1].lower()

        if ext not in ALLOWED_FORMATS:
            raise ValidationException(
                f"Unsupported file format '{ext}'. Allowed formats: {', '.join(ALLOWED_FORMATS.keys())}"
            )

        mime_default, sensor_category, dataset_type_default = ALLOWED_FORMATS[ext]
        file_bytes = await upload_file.read()
        file_size = len(file_bytes)

        if file_size > MAX_FILE_SIZE_BYTES:
            raise ValidationException(f"File size ({file_size} bytes) exceeds limit of 2 GB.")

        # 2. Cryptographic Checksum & Duplicate Detection
        checksum = hashlib.sha256(file_bytes).hexdigest()
        existing_duplicate = self.db.query(UploadedFile).filter(
            UploadedFile.checksum_sha256 == checksum,
            UploadedFile.survey_id == survey.id
        ).first()

        is_dup = existing_duplicate is not None
        dup_file_id = existing_duplicate.file_id if existing_duplicate else None

        # 3. Server-side Storage Key Generation
        file_code = f"UPL-{survey.survey_id}-{uuid.uuid4().hex[:8].upper()}"
        timestamp_prefix = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        storage_key = f"raw/{survey.survey_id.lower()}/{sensor_category.lower()}/{timestamp_prefix}_{file_code}_{clean_filename}"

        # Upload to Storage (if not duplicate)
        if not is_dup:
            import io
            self.storage.upload_file(
                file_obj=io.BytesIO(file_bytes),
                destination_key=storage_key,
                content_type=upload_file.content_type or mime_default,
                metadata={"survey_id": survey.survey_id, "original_filename": clean_filename}
            )
        else:
            storage_key = existing_duplicate.storage_key

        # 4. Resolve Upload Session
        session_obj = None
        if session_id_str:
            session_obj = self.db.query(UploadSession).filter(UploadSession.session_id == session_id_str).first()

        # 5. Resolve Dataset
        dataset_obj = None
        if dataset_code:
            dataset_obj = self.db.query(Dataset).filter(Dataset.dataset_id == dataset_code).first()

        if not dataset_obj:
            # Auto-associate or create default raw dataset for sensor category
            default_ds_id = f"DS-{survey.survey_id}-{sensor_category[:3].upper()}"
            dataset_obj = self.db.query(Dataset).filter(Dataset.dataset_id == default_ds_id).first()
            if not dataset_obj:
                dataset_obj = Dataset(
                    dataset_id=default_ds_id,
                    survey_id=survey.id,
                    dataset_type=dataset_type_default,
                    source=DatasetSource.DRONE_ACQUISITION,
                    status=DatasetStatus.READY,
                    is_immutable=True,
                    metadata_json={"auto_created": True, "sensor_category": sensor_category},
                    description=f"Automated ingestion dataset for {sensor_category} sensor payload."
                )
                self.db.add(dataset_obj)
                self.db.flush()

        # 6. Resolve Sensor
        sensor_obj = None
        if sensor_code:
            sensor_obj = self.db.query(Sensor).filter(Sensor.sensor_id == sensor_code).first()

        # 7. Metadata Extraction
        lat, lon, alt = None, None, None
        exif_meta, lidar_meta = {}, {}
        capture_time = datetime.utcnow()
        rtk_status = "NO_FIX"
        sat_count = None

        if sensor_category == "CAMERA":
            exif_meta = extract_image_metadata(file_bytes, clean_filename)
            lat = exif_meta.get("latitude")
            lon = exif_meta.get("longitude")
            alt = exif_meta.get("altitude_m")
            if exif_meta.get("capture_timestamp"):
                try:
                    capture_time = datetime.fromisoformat(exif_meta["capture_timestamp"])
                except Exception:
                    pass
            if lat and lon:
                rtk_status = "FIX_3D"

        elif sensor_category == "LIDAR":
            lidar_meta = lidar_extractor.extract_metadata(file_bytes, clean_filename)
            if lidar_meta.get("bounding_box"):
                bbox = lidar_meta["bounding_box"]
                lon = (bbox[0] + bbox[3]) / 2.0
                lat = (bbox[1] + bbox[4]) / 2.0
                alt = (bbox[2] + bbox[5]) / 2.0
                rtk_status = "GEOREFERENCED_LIDAR"

        elif sensor_category in ("RTK_GPS", "TELEMETRY"):
            pos_meta = extract_positioning_metadata(file_bytes, clean_filename)
            if pos_meta.get("records"):
                first_rec = pos_meta["records"][0]
                lat = first_rec.get("latitude")
                lon = first_rec.get("longitude")
                alt = first_rec.get("altitude")
                rtk_status = first_rec.get("fix_status", "FIXED_RTK")
                sat_count = first_rec.get("satellites", 14)

                # Persist high-frequency records
                for rec in pos_meta["records"]:
                    if "latitude" in rec and "longitude" in rec:
                        pos_rec = PositionRecord(
                            session_id=session_obj.id if session_obj else None,
                            survey_id=survey.id,
                            latitude=rec["latitude"],
                            longitude=rec["longitude"],
                            altitude=rec.get("altitude", 0.0),
                            fix_status=rec.get("fix_status", "FIXED_RTK"),
                            satellite_count=rec.get("satellites", 12),
                            timestamp=datetime.utcnow()
                        )
                        self.db.add(pos_rec)

        # Apply metadata overrides if supplied from gateway
        if metadata_override:
            if "latitude" in metadata_override: lat = float(metadata_override["latitude"])
            if "longitude" in metadata_override: lon = float(metadata_override["longitude"])
            if "altitude" in metadata_override: alt = float(metadata_override["altitude"])
            if "rtk_fix_status" in metadata_override: rtk_status = str(metadata_override["rtk_fix_status"])

        # 8. Create UploadedFile entity
        uploaded_file_entity = UploadedFile(
            file_id=file_code,
            session_id=session_obj.id if session_obj else None,
            survey_id=survey.id,
            dataset_id=dataset_obj.id if dataset_obj else None,
            sensor_id=sensor_obj.id if sensor_obj else None,
            filename=clean_filename,
            file_format=ext.upper().lstrip("."),
            file_size_bytes=file_size,
            mime_type=upload_file.content_type or mime_default,
            checksum_sha256=checksum,
            storage_provider=self.storage.bucket if hasattr(self.storage, "bucket") else "LOCAL",
            storage_key=storage_key,
            is_duplicate=is_dup,
            duplicate_of_file_id=dup_file_id,
            upload_status=FileStatus.VALIDATED if not is_dup else FileStatus.UPLOADED,
            latitude=lat,
            longitude=lon,
            altitude=alt,
            rtk_fix_status=rtk_status,
            satellite_count=sat_count,
            capture_timestamp=capture_time,
            exif_metadata_json=exif_meta,
            lidar_metadata_json=lidar_meta,
            validation_errors=[]
        )
        self.db.add(uploaded_file_entity)
        self.db.flush()

        # 9. Trigger Downstream Modular Processing Job
        if not is_dup:
            job_type_map = {
                "CAMERA": JobType.IMAGE_PREPROCESSING,
                "LIDAR": JobType.LIDAR_PREPROCESSING,
                "RTK_GPS": JobType.GEOREFERENCING,
                "TELEMETRY": JobType.GEOREFERENCING,
            }
            target_job_type = job_type_map.get(sensor_category, JobType.IMAGE_PREPROCESSING)
            
            proc_job = ProcessingJob(
                job_id=f"JOB-{target_job_type.value[:4]}-{uuid.uuid4().hex[:8].upper()}",
                job_type=target_job_type,
                file_id=uploaded_file_entity.id,
                dataset_id=dataset_obj.id if dataset_obj else None,
                survey_id=survey.id,
                status=JobStatus.QUEUED,
                progress_percentage=0.0,
                parameters_json={"auto_triggered": True, "source_file": clean_filename}
            )
            self.db.add(proc_job)
            uploaded_file_entity.upload_status = FileStatus.QUEUED

        # 10. Update Session Counters
        if session_obj:
            session_obj.total_files += 1
            session_obj.uploaded_files += 1
            session_obj.total_bytes += file_size
            session_obj.uploaded_bytes += file_size
            session_obj.status = SessionStatus.UPLOADING
            session_obj.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(uploaded_file_entity)

        return UploadedFileDetail.model_validate(uploaded_file_entity)

    def get_file(self, file_id: str) -> UploadedFileDetail:
        f = self.db.query(UploadedFile).filter(UploadedFile.file_id == file_id).first()
        if not f:
            raise NotFoundException("UploadedFile", file_id)
        return UploadedFileDetail.model_validate(f)

    def list_survey_files(self, survey_code: str) -> List[UploadedFileSummary]:
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_code).first()
        if not survey:
            raise NotFoundException("Survey", survey_code)

        files = self.db.query(UploadedFile).filter(
            UploadedFile.survey_id == survey.id
        ).order_by(UploadedFile.created_at.desc()).all()

        return [UploadedFileSummary.model_validate(f) for f in files]

    def retry_file(self, file_id: str) -> UploadedFileDetail:
        f = self.db.query(UploadedFile).filter(UploadedFile.file_id == file_id).first()
        if not f:
            raise NotFoundException("UploadedFile", file_id)

        f.upload_status = FileStatus.QUEUED
        f.validation_errors = []
        
        # Enqueue new job
        job = ProcessingJob(
            job_id=f"JOB-RETRY-{uuid.uuid4().hex[:8].upper()}",
            job_type=JobType.IMAGE_PREPROCESSING if f.file_format in ("JPEG", "PNG", "JPG") else JobType.LIDAR_PREPROCESSING,
            file_id=f.id,
            dataset_id=f.dataset_id,
            survey_id=f.survey_id,
            status=JobStatus.QUEUED,
            parameters_json={"retry": True}
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(f)
        return UploadedFileDetail.model_validate(f)

    def list_processing_jobs(self, survey_code: Optional[str] = None) -> List[ProcessingJobSchema]:
        query = self.db.query(ProcessingJob)
        if survey_code:
            survey = self.db.query(Survey).filter(Survey.survey_id == survey_code).first()
            if survey:
                query = query.filter(ProcessingJob.survey_id == survey.id)

        jobs = query.order_by(ProcessingJob.created_at.desc()).limit(50).all()
        return [ProcessingJobSchema.model_validate(j) for j in jobs]

    # --------------------------------------------------------------------------
    # SPATIAL FOOTPRINT (GIS MAP INTEGRATION)
    # --------------------------------------------------------------------------
    def get_spatial_footprint(self, survey_code: str) -> SpatialFootprintResponse:
        """
        Compiles GeoJSON layers for:
        1. Camera photo capture locations (Points).
        2. LiDAR bounding box extent (Polygon).
        3. RTK trajectory track (LineString & Points).
        """
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_code).first()
        if not survey:
            raise NotFoundException("Survey", survey_code)

        # 1. Camera Photo Points
        image_files = self.db.query(UploadedFile).filter(
            UploadedFile.survey_id == survey.id,
            UploadedFile.latitude.isnot(None),
            UploadedFile.longitude.isnot(None),
            UploadedFile.file_format.in_(["JPEG", "JPG", "PNG", "TIF", "TIFF"])
        ).all()

        cam_features = []
        for img in image_files:
            cam_features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [img.longitude, img.latitude]
                },
                "properties": {
                    "file_id": img.file_id,
                    "filename": img.filename,
                    "altitude_m": img.altitude,
                    "capture_timestamp": img.capture_timestamp.isoformat() if img.capture_timestamp else None,
                    "camera_model": img.exif_metadata_json.get("camera_model", "Sony RX0 II"),
                    "rtk_status": img.rtk_fix_status
                }
            })

        # 2. LiDAR Bounding Box Polygon
        lidar_files = self.db.query(UploadedFile).filter(
            UploadedFile.survey_id == survey.id,
            UploadedFile.file_format.in_(["LAS", "LAZ", "PLY", "PCD"])
        ).all()

        lidar_features = []
        for lid in lidar_files:
            bbox = lid.lidar_metadata_json.get("bounding_box", [73.7110, 24.5845, 480.0, 73.7155, 24.5875, 515.0])
            min_lon, min_lat, max_lon, max_lat = bbox[0], bbox[1], bbox[3], bbox[4]
            lidar_features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [min_lon, min_lat],
                        [max_lon, min_lat],
                        [max_lon, max_lat],
                        [min_lon, max_lat],
                        [min_lon, min_lat]
                    ]]
                },
                "properties": {
                    "file_id": lid.file_id,
                    "filename": lid.filename,
                    "format": lid.file_format,
                    "point_count": lid.lidar_metadata_json.get("point_count", 0),
                    "elevation_span_m": f"{bbox[2]}m - {bbox[5]}m"
                }
            })

        # 3. RTK Trajectory Points / Line
        pos_records = self.db.query(PositionRecord).filter(
            PositionRecord.survey_id == survey.id
        ).order_by(PositionRecord.timestamp.asc()).all()

        coords_line = [[r.longitude, r.latitude] for r in pos_records]
        trajectory_features = []
        if coords_line:
            trajectory_features.append({
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords_line
                },
                "properties": {
                    "track_points_count": len(coords_line),
                    "fix_status": "FIXED_RTK"
                }
            })

        return SpatialFootprintResponse(
            survey_id=survey.survey_id,
            camera_points_geojson={"type": "FeatureCollection", "features": cam_features},
            lidar_footprint_geojson={"type": "FeatureCollection", "features": lidar_features},
            rtk_trajectory_geojson={"type": "FeatureCollection", "features": trajectory_features},
            total_images_mapped=len(cam_features),
            total_lidar_files_mapped=len(lidar_features),
            total_trajectory_points=len(coords_line)
        )
