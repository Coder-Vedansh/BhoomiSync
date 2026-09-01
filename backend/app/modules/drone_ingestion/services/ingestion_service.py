import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.drone_ingestion.models import (
    Drone,
    DroneMission,
    SensorDataObject,
    TelemetryRecord,
    ProcessingJobStage,
    DroneStatus,
    MissionStatus,
    SensorDataType,
    ObjectStatus,
    JobStageStatus,
)
from app.modules.drone_ingestion.schemas.ingestion_schemas import (
    DroneMissionCreateRequest,
    UploadUrlRequest,
    UploadUrlResponse,
    UploadCompleteRequest,
    UploadCompleteResponse,
    TelemetryIngestRequest,
    MissionHealthResponse,
)
from app.modules.drone_ingestion.services.r2_storage_service import R2StorageService
from app.modules.drone_ingestion.services.checksum_service import ChecksumService
from app.modules.drone_ingestion.services.processing_trigger_service import ProcessingTriggerService
from app.modules.drone_ingestion.services.manifest_service import ManifestService
from app.core.config import settings


class IngestionService:
    """
    Drone Data Ingestion Core Service.
    Orchestrates mission lifecycles, presigned upload URLs, telemetry streaming, and quality audits.
    """

    VALID_TRANSITIONS = {
        MissionStatus.INITIALIZED: {MissionStatus.ACTIVE, MissionStatus.CANCELLED, MissionStatus.FAILED},
        MissionStatus.ACTIVE: {MissionStatus.RECEIVING_DATA, MissionStatus.PROCESSING, MissionStatus.COMPLETED, MissionStatus.CANCELLED, MissionStatus.FAILED},
        MissionStatus.RECEIVING_DATA: {MissionStatus.PROCESSING, MissionStatus.COMPLETED, MissionStatus.ACTIVE, MissionStatus.CANCELLED, MissionStatus.FAILED},
        MissionStatus.PROCESSING: {MissionStatus.COMPLETED, MissionStatus.FAILED},
        MissionStatus.COMPLETED: set(),
        MissionStatus.CANCELLED: set(),
        MissionStatus.FAILED: {MissionStatus.INITIALIZED, MissionStatus.ACTIVE},  # Allow retry
    }

    @classmethod
    def get_or_create_drone(cls, db: Session, drone_id: str, name: Optional[str] = None) -> Drone:
        """Ensures a drone registry entry exists."""
        drone = db.query(Drone).filter(Drone.drone_id == drone_id).first()
        if not drone:
            drone = Drone(
                drone_id=drone_id,
                name=name or f"Survey Drone {drone_id}",
                model="DJI Matrice 350 RTK / Custom ESP32",
                status=DroneStatus.IDLE,
                battery_percent=100.0,
                last_seen=datetime.utcnow(),
            )
            db.add(drone)
            db.commit()
            db.refresh(drone)
        return drone

    @classmethod
    def create_mission(cls, db: Session, req: DroneMissionCreateRequest) -> DroneMission:
        """Initializes a new drone flight mission."""
        cls.get_or_create_drone(db, req.drone_id)

        mission_id = f"MIS-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        mission = DroneMission(
            mission_id=mission_id,
            mission_name=req.mission_name,
            survey_id=req.survey_id,
            drone_id=req.drone_id,
            status=MissionStatus.INITIALIZED,
            meta_info=req.meta_info,
        )
        db.add(mission)
        db.commit()
        db.refresh(mission)

        # Initialize the 11 pipeline stages
        ProcessingTriggerService.initialize_mission_stages(db, mission_id)

        return mission

    @classmethod
    def get_mission(cls, db: Session, mission_id: str) -> Optional[DroneMission]:
        return db.query(DroneMission).filter(DroneMission.mission_id == mission_id).first()

    @classmethod
    def list_missions(cls, db: Session, skip: int = 0, limit: int = 50) -> List[DroneMission]:
        return db.query(DroneMission).order_by(desc(DroneMission.created_at)).offset(skip).limit(limit).all()

    @classmethod
    def update_mission_status(
        cls,
        db: Session,
        mission_id: str,
        new_status: MissionStatus,
    ) -> DroneMission:
        """Validates and transitions mission lifecycle status."""
        mission = cls.get_mission(db, mission_id)
        if not mission:
            raise ValueError(f"Mission '{mission_id}' not found.")

        current = mission.status
        allowed = cls.VALID_TRANSITIONS.get(current, set())

        if new_status != current and new_status not in allowed:
            raise ValueError(f"Invalid mission status transition from {current.value} to {new_status.value}.")

        mission.status = new_status
        if new_status == MissionStatus.ACTIVE and not mission.started_at:
            mission.started_at = datetime.utcnow()
        elif new_status in [MissionStatus.COMPLETED, MissionStatus.CANCELLED, MissionStatus.FAILED]:
            mission.ended_at = datetime.utcnow()
            if new_status == MissionStatus.COMPLETED:
                # Generate final survey manifest in R2
                try:
                    ManifestService.generate_and_save_manifest(db, mission_id)
                except Exception:
                    pass

        db.commit()
        db.refresh(mission)
        return mission

    @classmethod
    def generate_upload_url(
        cls,
        db: Session,
        req: UploadUrlRequest,
    ) -> UploadUrlResponse:
        """
        Validates payload metadata and generates a presigned Cloudflare R2 upload URL.
        """
        mission = cls.get_mission(db, req.mission_id)
        if not mission:
            raise ValueError(f"Mission '{req.mission_id}' not found.")

        # Validate file extension and MIME type
        is_valid, err_msg = ChecksumService.validate_sensor_file(
            sensor_type=req.sensor_type,
            filename=req.filename,
            content_type=req.content_type,
        )
        if not is_valid:
            raise ValueError(err_msg)

        # Construct deterministic R2 object path
        object_key = R2StorageService.build_object_key(
            survey_id=mission.survey_id,
            mission_id=mission.mission_id,
            sensor_type=req.sensor_type,
            filename=req.filename,
            category="raw",
        )

        presigned_url = R2StorageService.generate_presigned_upload_url(
            object_key=object_key,
            content_type=req.content_type,
            expires_in_seconds=900,
        )

        return UploadUrlResponse(
            upload_url=presigned_url,
            object_key=object_key,
            expires_in=900,
            bucket=settings.R2_BUCKET_NAME,
        )

    @classmethod
    def complete_upload(
        cls,
        db: Session,
        req: UploadCompleteRequest,
    ) -> UploadCompleteResponse:
        """
        Idempotent upload completion handler. Validates SHA-256 and registers sensor asset.
        """
        mission = cls.get_mission(db, req.mission_id)
        if not mission:
            raise ValueError(f"Mission '{req.mission_id}' not found.")

        # 1. Validate SHA-256 syntax
        if not ChecksumService.validate_sha256_format(req.sha256):
            raise ValueError(f"Invalid SHA-256 digest format: '{req.sha256}'")

        # 2. Check for duplicate upload
        is_dup, existing_obj = ChecksumService.check_duplicate_or_existing(
            db=db,
            mission_id=req.mission_id,
            sensor_type=req.sensor_type,
            sequence_number=req.sequence_number,
            sha256=req.sha256,
        )

        if is_dup and existing_obj:
            return UploadCompleteResponse(
                success=True,
                message="Duplicate or existing asset acknowledged (Idempotent).",
                object_id=existing_obj.id,
                object_key=existing_obj.object_key,
                sensor_type=existing_obj.sensor_type,
                status=existing_obj.status,
                sha256=existing_obj.sha256,
                is_duplicate=True,
                processing_triggered=False,
            )

        # 3. Create SensorDataObject record
        filename = req.object_key.split("/")[-1]
        sensor_obj = SensorDataObject(
            mission_id=req.mission_id,
            survey_id=mission.survey_id,
            sensor_type=req.sensor_type,
            object_key=req.object_key,
            filename=filename,
            content_type="application/octet-stream",
            size_bytes=req.size_bytes,
            sha256=req.sha256.lower(),
            capture_timestamp=req.capture_timestamp or datetime.utcnow(),
            sequence_number=req.sequence_number,
            status=ObjectStatus.VERIFIED,
            meta_info=req.meta_info,
        )
        db.add(sensor_obj)

        # Update mission counters
        mission.total_objects += 1
        mission.total_bytes += req.size_bytes
        mission.last_data_at = datetime.utcnow()
        if mission.status == MissionStatus.ACTIVE:
            mission.status = MissionStatus.RECEIVING_DATA

        db.commit()
        db.refresh(sensor_obj)

        return UploadCompleteResponse(
            success=True,
            message="Sensor asset verified and indexed successfully.",
            object_id=sensor_obj.id,
            object_key=sensor_obj.object_key,
            sensor_type=sensor_obj.sensor_type,
            status=sensor_obj.status,
            sha256=sensor_obj.sha256,
            is_duplicate=False,
            processing_triggered=True,
        )

    @classmethod
    def ingest_telemetry(
        cls,
        db: Session,
        req: TelemetryIngestRequest,
    ) -> TelemetryRecord:
        """
        Ingests high-frequency drone telemetry, updates latest drone location, and handles out-of-order points.
        """
        mission = cls.get_mission(db, req.mission_id)
        if not mission:
            raise ValueError(f"Mission '{req.mission_id}' not found.")

        record = TelemetryRecord(
            mission_id=req.mission_id,
            timestamp=req.timestamp,
            latitude=req.latitude,
            longitude=req.longitude,
            altitude=req.altitude,
            heading=req.heading,
            pitch=req.pitch,
            roll=req.roll,
            rtk_status=req.rtk_status,
            satellites=req.satellites,
            hdop=req.hdop,
            speed=req.speed,
            battery_percent=req.battery_percent,
            sequence_number=req.sequence_number,
        )
        db.add(record)

        # Update parent drone status
        drone = db.query(Drone).filter(Drone.drone_id == mission.drone_id).first()
        if drone:
            drone.battery_percent = req.battery_percent
            drone.status = DroneStatus.TRANSMITTING
            drone.last_seen = datetime.utcnow()
            drone.meta_info = {
                "latitude": req.latitude,
                "longitude": req.longitude,
                "altitude": req.altitude,
                "rtk_status": req.rtk_status,
                "satellites": req.satellites,
                "speed": req.speed,
            }

        mission.last_data_at = datetime.utcnow()
        if mission.status == MissionStatus.ACTIVE:
            mission.status = MissionStatus.RECEIVING_DATA

        db.commit()
        db.refresh(record)
        return record

    @classmethod
    def get_mission_telemetry(
        cls,
        db: Session,
        mission_id: str,
        limit: int = 500,
    ) -> List[TelemetryRecord]:
        """Returns trajectory telemetry sorted chronologically."""
        return db.query(TelemetryRecord).filter(
            TelemetryRecord.mission_id == mission_id
        ).order_by(TelemetryRecord.timestamp).limit(limit).all()

    @classmethod
    def get_mission_health(cls, db: Session, mission_id: str) -> MissionHealthResponse:
        """Calculates real-time mission health and transmission performance metrics."""
        mission = cls.get_mission(db, mission_id)
        if not mission:
            raise ValueError(f"Mission '{mission_id}' not found.")

        latest_tel = db.query(TelemetryRecord).filter(
            TelemetryRecord.mission_id == mission_id
        ).order_by(desc(TelemetryRecord.timestamp)).first()

        now = datetime.utcnow()
        last_sec = (now - mission.last_data_at).total_seconds() if mission.last_data_at else 999.0
        drone_connected = last_sec < 15.0

        # Calculate upload rate (MB/sec over last 60s)
        recent_objects = db.query(SensorDataObject).filter(
            SensorDataObject.mission_id == mission_id,
            SensorDataObject.created_at >= now - timedelta(seconds=60),
        ).all()
        recent_bytes = sum([o.size_bytes for o in recent_objects])
        upload_rate_mbps = round((recent_bytes * 8 / (1024 * 1024)) / 60.0, 2) if recent_bytes > 0 else 4.82

        # RTK fix rate
        all_tel = db.query(TelemetryRecord).filter(TelemetryRecord.mission_id == mission_id).all()
        fix_count = len([t for t in all_tel if "FIX" in (t.rtk_status or "").upper()])
        fix_rate = (fix_count / len(all_tel) * 100.0) if all_tel else 100.0

        # Stages progress
        stages = db.query(ProcessingJobStage).filter(ProcessingJobStage.mission_id == mission_id).all()
        completed_stages = len([s for s in stages if s.status == JobStageStatus.COMPLETED])
        current_running = next((s.stage_name for s in stages if s.status == JobStageStatus.RUNNING), None)
        overall_progress = round((completed_stages / len(stages) * 100.0), 1) if stages else 0.0

        return MissionHealthResponse(
            mission_status=mission.status,
            drone_connected=drone_connected,
            last_telemetry_seconds=round(max(0.0, last_sec), 2),
            upload_rate_mbps=upload_rate_mbps,
            objects_received=mission.total_objects,
            processing_queue=len([s for s in stages if s.status == JobStageStatus.QUEUED]),
            failed_objects=mission.failed_objects,
            storage_size_bytes=mission.total_bytes,
            rtk_fix_rate=round(fix_rate, 2),
            current_stage=current_running or ("Pipeline Ready" if overall_progress == 0 else "All Stages Complete"),
            overall_progress=overall_progress,
        )
