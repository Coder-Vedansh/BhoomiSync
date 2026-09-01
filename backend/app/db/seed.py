import math
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.survey import Survey, SurveyStatus
from app.models.dataset import (
    Dataset,
    DatasetFile,
    DatasetLineage,
    DatasetType,
    DatasetSource,
    DatasetStatus,
    FileProcessingStatus,
)
from app.models.parcel import (
    Parcel,
    ParcelAuditLog,
    DetectedBoundary,
    LandUseType,
    ParcelSource,
    VerificationStatus,
    ParcelAuditAction,
)
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
    JobStatus,
)
from app.modules.gis.spatial_utils import compute_parcel_metrics_from_geojson


def seed_mock_data(db: Session) -> None:
    """
    Seeds initial reference survey 'SUR-2026-001' with drone sensor datasets,
    orthomosaic/DEM derived layers, lineage records, georeferenced parcels,
    sensors, upload sessions, and ingested files with EXIF/LiDAR metadata.
    Also initializes RBAC roles, permissions, and demo user accounts.
    """
    # Always ensure RBAC and Demo users are seeded
    _seed_auth_and_rbac(db)

    existing = db.query(Survey).filter(Survey.survey_id == "SUR-2026-001").first()
    if existing:
        from app.models.ai_results import AIModel
        if not db.query(AIModel).first():
            _seed_ai_data_for_survey(db, existing)
        from app.models.land_records import LandParcel
        if not db.query(LandParcel).first():
            _seed_land_records_for_survey(db, existing)
        from app.models.reports import SurveyReport
        if not db.query(SurveyReport).first():
            _seed_reports_for_survey(db, existing)
        from app.models.drone_ingestion import DroneMission
        if not db.query(DroneMission).first():
            _seed_drone_missions(db, existing)
        return  # Already seeded base survey



    # Survey Area Boundary (Haripura Village Pilot, Udaipur, Rajasthan)
    survey_boundary = {
        "type": "Polygon",
        "coordinates": [[
            [73.7100, 24.5840],
            [73.7160, 24.5840],
            [73.7160, 24.5880],
            [73.7100, 24.5880],
            [73.7100, 24.5840]
        ]]
    }

    survey = Survey(
        survey_id="SUR-2026-001",
        name="Haripura Agricultural Resurvey Pilot",
        location="Haripura Village, Girwa Tehsil",
        district="Udaipur",
        state="Rajasthan",
        status=SurveyStatus.COMPLETED,
        survey_date=datetime.utcnow() - timedelta(days=2),
        center_latitude=24.5854,
        center_longitude=73.7125,
        boundary_geojson=survey_boundary,
        total_area_hectares=24.8,
        description="High-resolution drone data acquisition mission utilizing Sony RX0 II camera, Livox Mid-360 LiDAR, and RTK GNSS via ESP32-Phone Gateway."
    )
    db.add(survey)
    db.flush()

    # --------------------------------------------------------------------------
    # 0. Sensors Registry
    # --------------------------------------------------------------------------
    sensor_cam = Sensor(
        sensor_id="SENSOR-RGB-SONY-01",
        name="Sony RX0 II Ultra-Compact Survey Camera",
        sensor_type=SensorType.CAMERA,
        model="DSC-RX0M2",
        serial_number="SN-SONY-99214",
        specifications_json={
            "sensor": "1.0-type stacked Exmor RS CMOS",
            "megapixels": 15.3,
            "lens": "ZEISS Tessar T* 24mm F4.0",
            "shutter_speed": "1/32000s Anti-Distortion Electronic",
            "iso_range": "125-12800"
        }
    )
    sensor_lid = Sensor(
        sensor_id="SENSOR-LIDAR-LIVOX-01",
        name="Livox Mid-360 Solid-State 3D LiDAR",
        sensor_type=SensorType.LIDAR,
        model="Mid-360",
        serial_number="SN-LIVOX-44102",
        specifications_json={
            "point_rate_pts_per_sec": 200000,
            "detection_range_m": 100,
            "fov": "360° Horizontal x 59° Vertical",
            "precision_cm": 2.0
        }
    )
    sensor_rtk = Sensor(
        sensor_id="SENSOR-RTK-UBLOX-01",
        name="u-blox ZED-F9P Dual-Frequency RTK GNSS",
        sensor_type=SensorType.RTK_GPS,
        model="ZED-F9P Multi-Band",
        serial_number="SN-UBLOX-77182",
        specifications_json={
            "constellations": ["GPS", "GLONASS", "Galileo", "BeiDou", "NavIC"],
            "horizontal_accuracy_cm": 1.2,
            "vertical_accuracy_cm": 2.4,
            "update_rate_hz": 20
        }
    )
    db.add_all([sensor_cam, sensor_lid, sensor_rtk])
    db.flush()

    # --------------------------------------------------------------------------
    # 1. Raw Datasets
    # --------------------------------------------------------------------------
    ds_cam = Dataset(
        dataset_id="DS-2026-001-CAM",
        survey_id=survey.id,
        dataset_type=DatasetType.IMAGE,
        source=DatasetSource.DRONE_ACQUISITION,
        status=DatasetStatus.READY,
        is_immutable=True,
        metadata_json={
            "sensor": "Sony RX0 II",
            "focal_length_mm": 7.7,
            "flight_altitude_agl_m": 80.0,
            "image_count": 420,
            "ground_sampling_distance_cm": 2.2,
            "forward_overlap_pct": 80,
            "side_overlap_pct": 75
        },
        description="Raw Nadir RGB photogrammetric survey photos."
    )

    ds_lidar = Dataset(
        dataset_id="DS-2026-001-LID",
        survey_id=survey.id,
        dataset_type=DatasetType.LIDAR,
        source=DatasetSource.DRONE_ACQUISITION,
        status=DatasetStatus.READY,
        is_immutable=True,
        metadata_json={
            "sensor": "Livox Mid-360",
            "point_rate_pts_per_sec": 200000,
            "total_points": 14850200,
            "boresight_calibrated": True
        },
        description="Raw 3D point cloud capturing terrain elevation and field boundary bunds."
    )

    ds_rtk = Dataset(
        dataset_id="DS-2026-001-RTK",
        survey_id=survey.id,
        dataset_type=DatasetType.RTK,
        source=DatasetSource.DRONE_ACQUISITION,
        status=DatasetStatus.READY,
        is_immutable=True,
        metadata_json={
            "base_station": "HARIPURA_GCP_BASE_01",
            "fixed_rtk_percentage": 99.4,
            "horizontal_precision_cm": 1.2
        },
        description="Dual-frequency RTK GNSS base & rover observation RINEX logs."
    )

    ds_meta = Dataset(
        dataset_id="DS-2026-001-META",
        survey_id=survey.id,
        dataset_type=DatasetType.METADATA,
        source=DatasetSource.DRONE_ACQUISITION,
        status=DatasetStatus.READY,
        is_immutable=True,
        metadata_json={
            "gateway_device": "ESP32-WROOM-32",
            "relay_phone_os": "Android 14 (Surveyor App v1.0.4)"
        },
        description="Environmental, flight parameters and ESP32 gateway telemetry."
    )

    db.add_all([ds_cam, ds_lidar, ds_rtk, ds_meta])
    db.flush()

    # Files for Raw Datasets
    f_cam = DatasetFile(
        file_id="FILE-2026-001-CAM",
        dataset_id=ds_cam.id,
        filename="HARIPURA_RGB_SURVEY_BATCH_01.ZIP",
        file_type="application/zip",
        file_size_bytes=2458000000,  # ~2.45 GB
        checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        storage_provider="MOCK",
        storage_key="raw/sur-2026-001/images/HARIPURA_RGB_SURVEY_BATCH_01.ZIP",
        processing_status=FileProcessingStatus.VERIFIED
    )

    f_lidar = DatasetFile(
        file_id="FILE-2026-001-LID",
        dataset_id=ds_lidar.id,
        filename="HARIPURA_RAW_LIDAR_TERRAIN.LAS",
        file_type="application/octet-stream",
        file_size_bytes=1840000000,  # ~1.84 GB
        checksum="8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
        storage_provider="MOCK",
        storage_key="raw/sur-2026-001/lidar/HARIPURA_RAW_LIDAR_TERRAIN.LAS",
        processing_status=FileProcessingStatus.VERIFIED
    )

    f_rtk = DatasetFile(
        file_id="FILE-2026-001-RTK",
        dataset_id=ds_rtk.id,
        filename="HARIPURA_GNSS_TRAJECTORY.RINEX",
        file_type="text/plain",
        file_size_bytes=48500000,
        checksum="a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
        storage_provider="MOCK",
        storage_key="raw/sur-2026-001/rtk/HARIPURA_GNSS_TRAJECTORY.RINEX",
        processing_status=FileProcessingStatus.INDEXED
    )

    f_meta = DatasetFile(
        file_id="FILE-2026-001-META",
        dataset_id=ds_meta.id,
        filename="ESP32_MISSION_TELEMETRY.JSON",
        file_type="application/json",
        file_size_bytes=1240000,
        checksum="5d41402abc4b2a76b9719d911017c592",
        storage_provider="MOCK",
        storage_key="raw/sur-2026-001/meta/ESP32_MISSION_TELEMETRY.JSON",
        processing_status=FileProcessingStatus.INDEXED
    )

    db.add_all([f_cam, f_lidar, f_rtk, f_meta])
    db.flush()

    # --------------------------------------------------------------------------
    # 2. Derived Processed Datasets (Lineage)
    # --------------------------------------------------------------------------
    ds_ortho = Dataset(
        dataset_id="DS-2026-001-ORTHO",
        survey_id=survey.id,
        parent_dataset_id=ds_cam.id,
        dataset_type=DatasetType.ORTHOMOSAIC,
        source=DatasetSource.PROCESSING_PIPELINE,
        status=DatasetStatus.READY,
        is_immutable=True,
        metadata_json={
            "resolution_m_per_pixel": 0.025,
            "crs": "EPSG:4326",
            "blending_method": "MULTIBAND_SEAMLINE",
            "photogrammetry_pipeline": "SfM Bundle Adjustment"
        },
        description="Georeferenced 2D Orthomosaic GeoTIFF reconstructed from nadir camera images."
    )

    ds_dem = Dataset(
        dataset_id="DS-2026-001-DEM",
        survey_id=survey.id,
        parent_dataset_id=ds_lidar.id,
        dataset_type=DatasetType.DEM,
        source=DatasetSource.PROCESSING_PIPELINE,
        status=DatasetStatus.READY,
        is_immutable=True,
        metadata_json={
            "cell_size_m": 0.1,
            "filter_method": "Cloth Simulation Filter (CSF)",
            "vertical_datum": "EGM2008"
        },
        description="Bare-earth Digital Elevation Model raster derived from LiDAR point cloud."
    )

    db.add_all([ds_ortho, ds_dem])
    db.flush()

    f_ortho = DatasetFile(
        file_id="FILE-2026-001-ORTHO",
        dataset_id=ds_ortho.id,
        filename="HARIPURA_ORTHO_2CM_EPSG4326.TIF",
        file_type="image/tiff",
        file_size_bytes=860000000,
        checksum="3f79bb7b435b05321651daefd374cd681b49146565f64079342918550a1d7796",
        storage_provider="MOCK",
        storage_key="processed/sur-2026-001/HARIPURA_ORTHO_2CM_EPSG4326.TIF",
        processing_status=FileProcessingStatus.PROCESSED
    )

    f_dem = DatasetFile(
        file_id="FILE-2026-001-DEM",
        dataset_id=ds_dem.id,
        filename="HARIPURA_BARE_EARTH_DEM.TIF",
        file_type="image/tiff",
        file_size_bytes=340000000,
        checksum="e9c5f899e900c43666249e917d057a66e4a2c077b949cf0b01eb1dd6eb1b23ae",
        storage_provider="MOCK",
        storage_key="processed/sur-2026-001/HARIPURA_BARE_EARTH_DEM.TIF",
        processing_status=FileProcessingStatus.PROCESSED
    )

    db.add_all([f_ortho, f_dem])
    db.flush()

    # 3. AI Parcel Inference Dataset
    ds_ai_parcel = Dataset(
        dataset_id="DS-2026-001-AI-PRC",
        survey_id=survey.id,
        parent_dataset_id=ds_ortho.id,
        dataset_type=DatasetType.AI_RESULT,
        source=DatasetSource.AI_INFERENCE,
        status=DatasetStatus.READY,
        is_immutable=True,
        metadata_json={
            "ai_model": "SAM-Cadastral-Boundary-V2",
            "detected_parcels": 5,
            "mean_confidence": 0.958
        },
        description="AI segmented field parcel boundaries and classification."
    )
    db.add(ds_ai_parcel)
    db.flush()

    # Lineage edges
    lin1 = DatasetLineage(
        source_dataset_id=ds_cam.id,
        derived_dataset_id=ds_ortho.id,
        transformation_type="PHOTOGRAMMETRY_STITCH",
        parameters_json={"gsd_cm": 2.5}
    )
    lin2 = DatasetLineage(
        source_dataset_id=ds_lidar.id,
        derived_dataset_id=ds_dem.id,
        transformation_type="LIDAR_BARE_EARTH_EXTRACT",
        parameters_json={"filter": "CSF"}
    )
    lin3 = DatasetLineage(
        source_dataset_id=ds_ortho.id,
        derived_dataset_id=ds_ai_parcel.id,
        transformation_type="AI_PARCEL_SEGMENTATION",
        parameters_json={"confidence": 0.95}
    )
    db.add_all([lin1, lin2, lin3])
    db.flush()

    # --------------------------------------------------------------------------
    # 4. Ingestion: Upload Session, UploadedFiles & Trajectory Points
    # --------------------------------------------------------------------------
    session_01 = UploadSession(
        session_id="SESSION-2026-001-A1",
        survey_id=survey.id,
        device_id="ESP32-HARIPURA-PROTO-01",
        gateway_type="ESP32_PHONE",
        status=SessionStatus.COMPLETED,
        start_time=datetime.utcnow() - timedelta(days=2, hours=1),
        end_time=datetime.utcnow() - timedelta(days=2),
        total_files=5,
        uploaded_files=5,
        failed_files=0,
        total_bytes=4347740000,
        uploaded_bytes=4347740000,
        meta_info={"battery_start": 98, "battery_end": 42, "firmware": "v1.0.4"}
    )
    db.add(session_01)
    db.flush()

    # Ingested Photo Shots with EXIF Geotags
    sample_photos = [
        ("UPL-2026-001-0001", "DJI_0101_NADIR_RGB.JPG", 24.5848, 73.7115, 510.2, 4850000, "9a38f71b2a92"),
        ("UPL-2026-001-0002", "DJI_0102_NADIR_RGB.JPG", 24.5855, 73.7126, 510.4, 4920000, "b471c93a1098"),
        ("UPL-2026-001-0003", "DJI_0103_NADIR_RGB.JPG", 24.5862, 73.7138, 510.5, 4880000, "c720e8912384"),
        ("UPL-2026-001-0004", "DJI_0104_NADIR_RGB.JPG", 24.5870, 73.7150, 510.8, 5010000, "d810f7651239"),
    ]

    for p_id, p_name, p_lat, p_lon, p_alt, p_size, p_hash in sample_photos:
        up_file = UploadedFile(
            file_id=p_id,
            session_id=session_01.id,
            survey_id=survey.id,
            dataset_id=ds_cam.id,
            sensor_id=sensor_cam.id,
            filename=p_name,
            file_format="JPEG",
            file_size_bytes=p_size,
            mime_type="image/jpeg",
            checksum_sha256=p_hash * 5,
            storage_provider="MOCK",
            storage_key=f"raw/sur-2026-001/camera/{p_name}",
            upload_status=FileStatus.QUEUED,
            latitude=p_lat,
            longitude=p_lon,
            altitude=p_alt,
            gps_accuracy=0.015,
            rtk_fix_status="FIXED_RTK",
            satellite_count=18,
            capture_timestamp=datetime.utcnow() - timedelta(days=2),
            exif_metadata_json={
                "camera_make": "Sony",
                "camera_model": "DSC-RX0M2",
                "focal_length_mm": 7.7,
                "shutter_speed": "1/1600s",
                "iso": 200,
                "latitude": p_lat,
                "longitude": p_lon,
                "altitude_m": p_alt
            }
        )
        db.add(up_file)
        db.flush()

        # Associated Processing Job
        job = ProcessingJob(
            job_id=f"JOB-IMG-{p_id[-4:]}",
            job_type=JobType.IMAGE_PREPROCESSING,
            file_id=up_file.id,
            dataset_id=ds_cam.id,
            survey_id=survey.id,
            status=JobStatus.COMPLETED,
            progress_percentage=100.0,
            parameters_json={"exif_parsed": True},
            result_json={"distortion_corrected": True, "georeferenced": True}
        )
        db.add(job)

    # Ingested LiDAR point cloud file
    up_lidar = UploadedFile(
        file_id="UPL-2026-001-0005",
        session_id=session_01.id,
        survey_id=survey.id,
        dataset_id=ds_lidar.id,
        sensor_id=sensor_lid.id,
        filename="HARIPURA_LIVOX_STRIP_01.LAZ",
        file_format="LAZ",
        file_size_bytes=380000000,
        mime_type="application/octet-stream",
        checksum_sha256="7718fa89127812903189fa89127812903189fa89127812903189fa8912781290",
        storage_provider="MOCK",
        storage_key="raw/sur-2026-001/lidar/HARIPURA_LIVOX_STRIP_01.LAZ",
        upload_status=FileStatus.QUEUED,
        latitude=24.5855,
        longitude=73.7130,
        altitude=510.0,
        rtk_fix_status="GEOREFERENCED_LIDAR",
        lidar_metadata_json={
            "format": "LAZ",
            "point_count": 4850000,
            "bounding_box": [73.7110, 24.5845, 480.0, 73.7155, 24.5875, 515.0],
            "coordinate_system": "EPSG:4326"
        }
    )
    db.add(up_lidar)
    db.flush()

    job_lidar = ProcessingJob(
        job_id="JOB-LID-0005",
        job_type=JobType.LIDAR_PREPROCESSING,
        file_id=up_lidar.id,
        dataset_id=ds_lidar.id,
        survey_id=survey.id,
        status=JobStatus.COMPLETED,
        progress_percentage=100.0,
        parameters_json={"csf_ground_filter": True}
    )
    db.add(job_lidar)

    # Ingested RTK GNSS Trajectory Points
    flight_track = [
        (24.5842, 73.7105, 510.0),
        (24.5850, 73.7115, 510.2),
        (24.5858, 73.7128, 510.5),
        (24.5866, 73.7140, 510.7),
        (24.5875, 73.7155, 511.0),
        (24.5870, 73.7158, 510.8),
        (24.5860, 73.7145, 510.5),
        (24.5848, 73.7130, 510.3),
        (24.5842, 73.7110, 510.0),
    ]

    for t_idx, (t_lat, t_lon, t_alt) in enumerate(flight_track):
        p_rec = PositionRecord(
            session_id=session_01.id,
            survey_id=survey.id,
            latitude=t_lat,
            longitude=t_lon,
            altitude=t_alt,
            accuracy_horizontal_m=0.012,
            accuracy_vertical_m=0.024,
            fix_status="FIXED_RTK",
            satellite_count=18,
            timestamp=datetime.utcnow() - timedelta(days=2, minutes=30 - (t_idx * 3))
        )
        db.add(p_rec)

    # --------------------------------------------------------------------------
    # 5. Realistic Fictional Agricultural Parcels in Haripura (EPSG:4326 Coordinates)
    # --------------------------------------------------------------------------
    parcels_data = [
        {
            "parcel_id": "PRC-SUR-2026-001-01",
            "land_use": LandUseType.AGRICULTURAL_CROP,
            "source": ParcelSource.SURVEYOR_VERIFIED,
            "confidence": 0.98,
            "status": VerificationStatus.VERIFIED,
            "attributes": {"crop_type": "Wheat (Rabi)", "soil_type": "Black Loamy", "khasra_no": "104/1"},
            "coords": [
                [73.7110, 24.5845],
                [73.7130, 24.5845],
                [73.7130, 24.5865],
                [73.7110, 24.5865],
                [73.7110, 24.5845]
            ]
        },
        {
            "parcel_id": "PRC-SUR-2026-001-02",
            "land_use": LandUseType.AGRICULTURAL_CROP,
            "source": ParcelSource.MANUAL_DIGITIZED,
            "confidence": 0.95,
            "status": VerificationStatus.MANUALLY_EDITED,
            "attributes": {"crop_type": "Mustard (Sarson)", "soil_type": "Alluvial", "khasra_no": "104/2"},
            "coords": [
                [73.7132, 24.5845],
                [73.7155, 24.5845],
                [73.7155, 24.5875],
                [73.7132, 24.5875],
                [73.7132, 24.5845]
            ]
        },
        {
            "parcel_id": "PRC-SUR-2026-001-03",
            "land_use": LandUseType.AGRICULTURAL_FALLOW,
            "source": ParcelSource.AI_SEGMENTATION,
            "confidence": 0.91,
            "status": VerificationStatus.AI_DETECTED,
            "attributes": {"crop_type": "Fallow (Seasonal Rest)", "khasra_no": "105/1"},
            "coords": [
                [73.7110, 24.5867],
                [73.7128, 24.5867],
                [73.7128, 24.5878],
                [73.7110, 24.5878],
                [73.7110, 24.5867]
            ]
        },
        {
            "parcel_id": "PRC-SUR-2026-001-04",
            "land_use": LandUseType.ORCHARD_PLANTATION,
            "source": ParcelSource.AI_SEGMENTATION,
            "confidence": 0.94,
            "status": VerificationStatus.AI_DETECTED,
            "attributes": {"crop_type": "Guava (Amrood) Plantation", "khasra_no": "105/2"},
            "coords": [
                [73.7130, 24.5867],
                [73.7152, 24.5867],
                [73.7152, 24.5878],
                [73.7130, 24.5878],
                [73.7130, 24.5867]
            ]
        },
        {
            "parcel_id": "PRC-SUR-2026-001-05",
            "land_use": LandUseType.WATER_BODY,
            "source": ParcelSource.SURVEYOR_VERIFIED,
            "confidence": 0.99,
            "status": VerificationStatus.VERIFIED,
            "attributes": {"water_body_type": "Village Pond / Rainwater Harvesting", "khasra_no": "106"},
            "coords": [
                [73.7145, 24.5850],
                [73.7158, 24.5850],
                [73.7158, 24.5860],
                [73.7145, 24.5860],
                [73.7145, 24.5850]
            ]
        }
    ]

    for p_info in parcels_data:
        geom = {
            "type": "Polygon",
            "coordinates": [p_info["coords"]]
        }
        metrics = compute_parcel_metrics_from_geojson(geom)
        slope_val = 3.2 + (len(p_info["parcel_id"]) % 4) * 0.7
        planar_m2 = metrics["area_m2"]
        surface_m2 = round(planar_m2 / math.cos(math.radians(slope_val)), 2)

        parcel = Parcel(
            parcel_id=p_info["parcel_id"],
            survey_id=survey.id,
            dataset_id=ds_ai_parcel.id,
            geometry_geojson=geom,
            crs="EPSG:4326",
            area_m2=planar_m2,
            area_hectares=round(planar_m2 / 10000.0, 4),
            perimeter_m=metrics["perimeter_m"],
            centroid_lat=metrics["centroid_lat"],
            centroid_lon=metrics["centroid_lon"],
            surface_area_m2=surface_m2,
            surface_area_hectares=round(surface_m2 / 10000.0, 4),
            slope_degrees=slope_val,
            elevation_min_m=582.4,
            elevation_max_m=595.2,
            land_use=p_info["land_use"],
            source=p_info["source"],
            confidence=p_info["confidence"],
            verification_status=p_info["status"],
            version=1,
            attributes_json=p_info["attributes"]
        )
        db.add(parcel)
        db.flush()

        audit = ParcelAuditLog(
            parcel_id=parcel.id,
            version=1,
            action=ParcelAuditAction.CREATED,
            previous_geometry_geojson=None,
            new_geometry_geojson=geom,
            editor_id="ai_cadastral_engine",
            comment="Initial AI detection & cadastral boundary segmentation from survey orthomosaic.",
            timestamp=datetime.utcnow() - timedelta(days=1)
        )
        db.add(audit)

    # 6. Seed Automatically Detected Candidate Boundaries
    detected_bounds = [
        ("BND-SUR-2026-001-01", 0.94, "LIDAR_ELEVATION_BUND_RIDGE", [[73.7110, 24.5845], [73.7130, 24.5845], [73.7130, 24.5865], [73.7110, 24.5865], [73.7110, 24.5845]]),
        ("BND-SUR-2026-001-02", 0.91, "SPECTRAL_CROP_CANOPY_EDGE", [[73.7132, 24.5845], [73.7155, 24.5845], [73.7155, 24.5875], [73.7132, 24.5875], [73.7132, 24.5845]]),
        ("BND-SUR-2026-001-03", 0.88, "IRRIGATION_CHANNEL_TRANSITION", [[73.7110, 24.5867], [73.7128, 24.5867], [73.7128, 24.5878], [73.7110, 24.5878], [73.7110, 24.5867]]),
        ("BND-SUR-2026-001-04", 0.86, "TREE_HEDGEROW_ALIGNED_BUND", [[73.7130, 24.5867], [73.7152, 24.5867], [73.7152, 24.5878], [73.7130, 24.5878], [73.7130, 24.5867]]),
        ("BND-SUR-2026-001-05", 0.95, "VILLAGE_ACCESS_ROAD_PERIMETER", [[73.7145, 24.5850], [73.7158, 24.5850], [73.7158, 24.5860], [73.7145, 24.5860], [73.7145, 24.5850]]),
    ]

    for b_id, b_conf, b_meth, b_coords in detected_bounds:
        db_bnd = DetectedBoundary(
            boundary_id=b_id,
            survey_id=survey.id,
            geometry_geojson={"type": "Polygon", "coordinates": [b_coords]},
            confidence_score=b_conf,
            detection_method=b_meth,
            source_dataset="DS-2026-001-ORTHO",
            status="AUTO_DETECTED",
        )
        db.add(db_bnd)

    # 7. Seed Prompt 4 AI Data
    _seed_ai_data_for_survey(db, survey)
    
    # 8. Seed Prompt 5 Land Records & Cadastre Data
    _seed_land_records_for_survey(db, survey)
    db.commit()


def _seed_ai_data_for_survey(db: Session, survey: Survey) -> None:
    """
    Seeds Prompt 4 AI Models, Inferences, Classification Polygons,
    Candidate Boundaries, and Historical Change Detections idempotently.
    """
    from app.models.ai_results import (
        AIModel,
        AIModelType,
        AIModelStatus,
        AIInferenceResult,
        AIClassificationResult,
        AIBoundaryResult,
        AIChangeResult,
        AIVerificationStatus,
        AIChangeSeverity,
    )

    models_to_seed = [
        AIModel(
            model_id="land-classifier-yolo-v1",
            model_name="YOLOv9 Cadastral Land-Use Classifier",
            model_type=AIModelType.LAND_CLASSIFICATION,
            version="1.2.0",
            framework="Ultralytics YOLO / ONNX",
            classes=["AGRICULTURAL", "FALLOW", "VEGETATION", "WATER", "BUILDING", "ROAD", "BARREN", "OTHER"],
            input_requirements=["RGB_ORTHOMOSAIC", "DEM_RASTER"],
            sensor_requirements=["CAMERA", "LIDAR"],
            model_path="weights/yolo_cadastre_v1.pt",
            status=AIModelStatus.ACTIVE,
            created_at=datetime.utcnow() - timedelta(days=10),
            activated_at=datetime.utcnow() - timedelta(days=10),
        ),
        AIModel(
            model_id="boundary-segmentation-v2",
            model_name="Multi-Sensor Bund Ridge Segmenter",
            model_type=AIModelType.BOUNDARY_DETECTION,
            version="2.0.0",
            framework="PyTorch SAM / UNet-LiDAR",
            classes=["FIELD_BUND_RIDGE", "CROP_TRANSITION", "ROAD_EDGE", "WATER_SHORELINE"],
            input_requirements=["LIDAR_POINT_CLOUD", "RGB_ORTHOMOSAIC", "DEM_GRADIENT"],
            sensor_requirements=["CAMERA", "LIDAR", "RTK_GPS"],
            model_path="weights/sam_boundary_v2.pth",
            status=AIModelStatus.ACTIVE,
            created_at=datetime.utcnow() - timedelta(days=8),
            activated_at=datetime.utcnow() - timedelta(days=8),
        ),
        AIModel(
            model_id="agri-detector-v1",
            model_name="Agricultural Crop & Vegetation Health Detector",
            model_type=AIModelType.INSTANCE_SEGMENTATION,
            version="1.1.0",
            framework="PyTorch / torchvision",
            classes=["WHEAT", "MUSTARD", "PULSES", "COTTON", "FALLOW_TERRACE", "ORCHARD"],
            input_requirements=["RGB_ORTHOMOSAIC", "MULTISPECTRAL_NDVI", "LIDAR_CANOPY"],
            sensor_requirements=["CAMERA", "LIDAR"],
            model_path="weights/agri_crop_v1.pt",
            status=AIModelStatus.ACTIVE,
            created_at=datetime.utcnow() - timedelta(days=5),
            activated_at=datetime.utcnow() - timedelta(days=5),
        ),
        AIModel(
            model_id="change-detector-v1",
            model_name="Siamese Temporal Cadastral ChangeNet",
            model_type=AIModelType.CHANGE_DETECTION,
            version="1.5.0",
            framework="PyTorch Siamese ChangeNet",
            classes=["BOUNDARY_SHIFT", "POTENTIAL_ENCROACHMENT", "LAND_USE_CHANGE", "NEW_STRUCTURE"],
            input_requirements=["HISTORICAL_CADASTRE", "NEW_ORTHOMOSAIC", "NEW_DEM"],
            sensor_requirements=["CAMERA", "LIDAR"],
            model_path="weights/siamese_cadastre_v1.pt",
            status=AIModelStatus.ACTIVE,
            created_at=datetime.utcnow() - timedelta(days=3),
            activated_at=datetime.utcnow() - timedelta(days=3),
        ),
    ]

    for m in models_to_seed:
        if not db.query(AIModel).filter(AIModel.model_id == m.model_id).first():
            db.add(m)
    db.flush()

    # Seed AI Inference Result Container
    inf_class = db.query(AIInferenceResult).filter(AIInferenceResult.inference_id == "INF-CLASS-SUR-2026-001-INIT").first()
    if not inf_class:
        inf_class = AIInferenceResult(
            inference_id="INF-CLASS-SUR-2026-001-INIT",
            survey_id=survey.id,
            model_id="land-classifier-yolo-v1",
            model_version="1.2.0",
            inference_type=AIModelType.LAND_CLASSIFICATION,
            execution_time_ms=412.5,
            confidence_overall=0.92,
            summary_metrics_json={"AGRICULTURAL": 64.2, "FALLOW": 15.1, "VEGETATION": 10.4, "WATER": 4.2, "BUILDING": 3.8, "ROAD": 2.3},
            is_demo_simulation=True,
            created_at=datetime.utcnow() - timedelta(days=1),
        )
        db.add(inf_class)
        db.flush()

    # Seed AI Classification Results
    class_polys = [
        ("AGRICULTURAL", 0.94, 24500.0, 2.45, 64.2, [[73.7110, 24.5845], [73.7150, 24.5845], [73.7150, 24.5875], [73.7110, 24.5875], [73.7110, 24.5845]]),
        ("FALLOW", 0.88, 5750.0, 0.575, 15.1, [[73.7150, 24.5845], [73.7175, 24.5845], [73.7175, 24.5865], [73.7150, 24.5865], [73.7150, 24.5845]]),
        ("VEGETATION", 0.91, 3960.0, 0.396, 10.4, [[73.7110, 24.5875], [73.7140, 24.5875], [73.7140, 24.5895], [73.7110, 24.5895], [73.7110, 24.5875]]),
        ("WATER", 0.96, 1600.0, 0.160, 4.2, [[73.7140, 24.5875], [73.7160, 24.5875], [73.7160, 24.5895], [73.7140, 24.5895], [73.7140, 24.5875]]),
        ("BUILDING", 0.92, 1450.0, 0.145, 3.8, [[73.7160, 24.5875], [73.7175, 24.5875], [73.7175, 24.5895], [73.7160, 24.5895], [73.7160, 24.5875]]),
        ("ROAD", 0.89, 880.0, 0.088, 2.3, [[73.7110, 24.5835], [73.7175, 24.5835], [73.7175, 24.5845], [73.7110, 24.5845], [73.7110, 24.5835]]),
    ]

    for idx, (c_name, c_conf, c_area, c_ha, c_pct, c_geom) in enumerate(class_polys, start=1):
        res_id = f"RES-CLASS-SUR-2026-001-{idx:02d}"
        if not db.query(AIClassificationResult).filter(AIClassificationResult.result_id == res_id).first():
            c_rec = AIClassificationResult(
                result_id=res_id,
                inference_id=inf_class.id,
                survey_id=survey.id,
                class_name=c_name,
                confidence=c_conf,
                area_m2=c_area,
                area_hectares=c_ha,
                percentage=c_pct,
                geometry_geojson={"type": "Polygon", "coordinates": [c_geom]},
                crs="EPSG:4326",
                source_dataset_id="DS-2026-001-ORTHO",
                model_version="1.2.0",
                created_at=datetime.utcnow() - timedelta(days=1),
            )
            db.add(c_rec)

    # Seed AI Boundary Candidate Results
    inf_bnd = db.query(AIInferenceResult).filter(AIInferenceResult.inference_id == "INF-BND-SUR-2026-001-INIT").first()
    if not inf_bnd:
        inf_bnd = AIInferenceResult(
            inference_id="INF-BND-SUR-2026-001-INIT",
            survey_id=survey.id,
            model_id="boundary-segmentation-v2",
            model_version="2.0.0",
            inference_type=AIModelType.BOUNDARY_DETECTION,
            execution_time_ms=380.0,
            confidence_overall=0.91,
            summary_metrics_json={"total_candidates": 4},
            is_demo_simulation=True,
            created_at=datetime.utcnow() - timedelta(days=1),
        )
        db.add(inf_bnd)
        db.flush()

    bnd_candidates = [
        ("BND-SUR-2026-001-001", "FIELD_BUND_RIDGE", 0.94, ["LIDAR", "RGB_ORTHOMOSAIC", "DEM_GRADIENT"], [[73.7110, 24.5845], [73.7135, 24.5845], [73.7135, 24.5865], [73.7110, 24.5865], [73.7110, 24.5845]], 24200.0, 620.0),
        ("BND-SUR-2026-001-002", "FIELD_BUND_RIDGE", 0.91, ["LIDAR", "RGB_ORTHOMOSAIC"], [[73.7135, 24.5845], [73.7160, 24.5845], [73.7160, 24.5865], [73.7135, 24.5865], [73.7135, 24.5845]], 24200.0, 620.0),
        ("BND-SUR-2026-001-003", "CROP_TRANSITION", 0.86, ["RGB_ORTHOMOSAIC", "DEM_GRADIENT"], [[73.7110, 24.5865], [73.7140, 24.5865], [73.7140, 24.5885], [73.7110, 24.5885], [73.7110, 24.5865]], 29000.0, 680.0),
        ("BND-SUR-2026-001-004", "ROAD_EDGE", 0.95, ["RGB_ORTHOMOSAIC", "LIDAR"], [[73.7140, 24.5865], [73.7170, 24.5865], [73.7170, 24.5885], [73.7140, 24.5885], [73.7140, 24.5865]], 29000.0, 680.0),
    ]

    for b_id, b_type, b_conf, b_src, b_geom, b_area, b_len in bnd_candidates:
        if not db.query(AIBoundaryResult).filter(AIBoundaryResult.boundary_id == b_id).first():
            b_rec = AIBoundaryResult(
                boundary_id=b_id,
                inference_id=inf_bnd.id,
                survey_id=survey.id,
                boundary_type=b_type,
                confidence=b_conf,
                sources_json=b_src,
                geometry_geojson={"type": "Polygon", "coordinates": [b_geom]},
                crs="EPSG:4326",
                length_m=b_len,
                estimated_area_m2=b_area,
                verification_status=AIVerificationStatus.CANDIDATE,
                created_at=datetime.utcnow() - timedelta(days=1),
            )
            db.add(b_rec)

    # Seed AI Historical Change Results
    inf_chg = db.query(AIInferenceResult).filter(AIInferenceResult.inference_id == "INF-CHG-SUR-2026-001-INIT").first()
    if not inf_chg:
        inf_chg = AIInferenceResult(
            inference_id="INF-CHG-SUR-2026-001-INIT",
            survey_id=survey.id,
            model_id="change-detector-v1",
            model_version="1.5.0",
            inference_type=AIModelType.CHANGE_DETECTION,
            execution_time_ms=520.0,
            confidence_overall=0.93,
            summary_metrics_json={"total_changes": 4, "potential_encroachments_count": 1},
            is_demo_simulation=True,
            created_at=datetime.utcnow() - timedelta(days=1),
        )
        db.add(inf_chg)
        db.flush()

    changes_to_seed = [
        ("CHG-SUR-2026-001-001", "POTENTIAL_ENCROACHMENT", AIChangeSeverity.CRITICAL_ENCROACHMENT, "Agricultural Buffer (Khasra 104/2)", "New Unauthorized Concrete Enclosure", 142.5, 3.2, 0.94, [[73.7128, 24.5852], [73.7134, 24.5852], [73.7134, 24.5856], [73.7128, 24.5856], [73.7128, 24.5852]]),
        ("CHG-SUR-2026-001-002", "BOUNDARY_SHIFT", AIChangeSeverity.MEDIUM, "Historical 1998 Boundary Line", "Modern Physical Ridge Bund", 88.0, 1.8, 0.89, [[73.7145, 24.5858], [73.7152, 24.5858], [73.7152, 24.5864], [73.7145, 24.5864], [73.7145, 24.5858]]),
        ("CHG-SUR-2026-001-003", "LAND_USE_CHANGE", AIChangeSeverity.LOW, "FALLOW_LAND", "AGRICULTURAL_CROP (Mustard)", 2150.0, 18.5, 0.96, [[73.7150, 24.5845], [73.7170, 24.5845], [73.7170, 24.5860], [73.7150, 24.5860], [73.7150, 24.5845]]),
        ("CHG-SUR-2026-001-004", "NEW_STRUCTURE", AIChangeSeverity.HIGH, "Open Agricultural Land", "Solar Irrigation Pump Shed", 64.0, 1.2, 0.93, [[73.7118, 24.5872], [73.7124, 24.5872], [73.7124, 24.5878], [73.7118, 24.5878], [73.7118, 24.5872]]),
    ]

    for chg_id, chg_type, chg_sev, old_v, new_v, a_m2, p_chg, c_conf, chg_geom in changes_to_seed:
        if not db.query(AIChangeResult).filter(AIChangeResult.change_id == chg_id).first():
            chg_rec = AIChangeResult(
                change_id=chg_id,
                inference_id=inf_chg.id,
                survey_id=survey.id,
                change_type=chg_type,
                severity=chg_sev,
                old_value=old_v,
                new_value=new_v,
                area_affected_m2=a_m2,
                percentage_change=p_chg,
                confidence=c_conf,
                geometry_geojson={"type": "Polygon", "coordinates": [chg_geom]},
                crs="EPSG:4326",
                historical_dataset_id="DS-1998-CADASTRE",
                current_dataset_id="DS-2026-001-ORTHO",
                audit_status="PENDING_SURVEYOR_REVIEW",
                created_at=datetime.utcnow() - timedelta(days=1),
            )
            db.add(chg_rec)

    db.commit()


def _seed_land_records_for_survey(db: Session, survey: Survey) -> None:
    """
    Seeds Prompt 5 Cadastral Land Parcels (20 parcels in Haripura Village),
    Land Owners, Ownership links, Cadastral Versions, Documents, and Change Records.
    """
    from app.models.land_records import (
        LandParcel,
        LandOwner,
        ParcelOwnership,
        LandRecord,
        CadastralVersion,
        ParcelChangeRecord,
        ParcelDocument,
        LandRecordImportSession,
        OwnershipType,
        LandStatus,
        RecordStatus,
        VerificationStatus,
        MatchStatus,
    )
    from app.modules.land_records.importers.mock_gov_importer import MockGovernmentDatasetImporter

    # 1. Create Import Session record
    import_sess = db.query(LandRecordImportSession).filter(LandRecordImportSession.session_id == "IMP-SESS-HARIPURA-INIT").first()
    if not import_sess:
        import_sess = LandRecordImportSession(
            session_id="IMP-SESS-HARIPURA-INIT",
            source_name="Rajasthan Revenue Department (Apna Khata / Bhunaksha Mock Dataset)",
            source_type="MOCK_GOV_DATASET",
            filename="haripura_cadastral_settlement_2026.json",
            checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            total_records=20,
            successful_records=20,
            failed_records=0,
            duplicate_records=0,
            status="COMPLETED",
            imported_by="REVENUE_SETTLEMENT_OFFICER",
            created_at=datetime.utcnow() - timedelta(days=2),
            completed_at=datetime.utcnow() - timedelta(days=2),
        )
        db.add(import_sess)
        db.flush()

    mock_parcels = MockGovernmentDatasetImporter.get_mock_parcels()

    for idx, p_data in enumerate(mock_parcels, start=1):
        p_id = p_data["parcel_id"]
        existing_p = db.query(LandParcel).filter(LandParcel.parcel_id == p_id).first()
        if existing_p:
            continue

        # Create Owner
        owner_name = p_data.get("owner_name", "Registered Khatedar")
        owner_ref = f"OWN-HR-{idx:03d}"
        o_type = OwnershipType.INDIVIDUAL
        try:
            o_type = OwnershipType[p_data.get("owner_type", "INDIVIDUAL")]
        except Exception:
            pass

        owner = LandOwner(
            owner_id=f"OWN-ID-HR-{idx:03d}",
            owner_reference=owner_ref,
            name=owner_name,
            ownership_type=o_type,
            ownership_percentage=100.0,
            contact_reference=f"HASH-TEL-9129{idx:04d}",
            record_source="Apna Khata Land Registry",
            created_at=datetime.utcnow() - timedelta(days=5),
        )
        db.add(owner)
        db.flush()

        # Create LandParcel
        v_stat = VerificationStatus.SURVEYOR_VERIFIED if p_data.get("verified_area_m2") else VerificationStatus.PENDING
        m_stat = MatchStatus[p_data.get("match_status", "MATCHED")] if p_data.get("match_status") in MatchStatus.__members__ else MatchStatus.MATCHED

        parcel = LandParcel(
            parcel_id=p_id,
            survey_id=survey.id,
            survey_number=p_data["survey_number"],
            subdivision_number=p_data.get("subdivision_number", "1"),
            state="Rajasthan",
            district="Udaipur",
            tehsil="Girwa",
            village="Haripura",
            land_record_source=p_data.get("land_record_source", "Rajasthan Revenue Dept"),
            official_area_m2=p_data["official_area_m2"],
            official_area_hectares=p_data["official_area_hectares"],
            drone_measured_area_m2=p_data.get("drone_measured_area_m2"),
            historical_area_m2=p_data.get("historical_area_m2"),
            verified_area_m2=p_data.get("verified_area_m2"),
            cadastral_geometry=p_data["cadastral_geometry"],
            current_geometry=p_data.get("current_geometry"),
            verified_geometry=p_data.get("verified_geometry"),
            geometry_source="REVENUE_CADASTRAL_MAP",
            land_status=LandStatus.ACTIVE,
            land_use=p_data["land_use"],
            ai_detected_land_use=p_data.get("ai_detected_land_use"),
            classification_confidence=p_data.get("classification_confidence", 0.92),
            ownership_status=p_data.get("ownership_status", "CLEAR_TITLED"),
            record_status=RecordStatus.OFFICIAL,
            verification_status=v_stat,
            match_status=m_stat,
            match_confidence=p_data.get("match_confidence", 0.95),
            notes=p_data.get("notes"),
            created_at=datetime.utcnow() - timedelta(days=2),
        )
        db.add(parcel)
        db.flush()

        # Link Ownership
        ownership_link = ParcelOwnership(
            parcel_id=parcel.id,
            owner_id=owner.id,
            ownership_percentage=100.0,
            ownership_start_date=datetime.utcnow() - timedelta(days=365 * 3),
            ownership_status="ACTIVE",
            source_record_id="IMP-SESS-HARIPURA-INIT",
            created_at=datetime.utcnow() - timedelta(days=2),
        )
        db.add(ownership_link)

        # Source Land Record
        doc_rec = LandRecord(
            record_id=f"REC-HR-2026-{idx:03d}",
            parcel_id=parcel.id,
            import_session_id=import_sess.id,
            record_type="KHASRA_RECORD",
            source="Rajasthan Revenue Department (Apna Khata)",
            document_reference=f"JAMABANDI-2025-HR-{p_data['survey_number']}",
            record_date=datetime(2025, 6, 1),
            effective_date=datetime(2025, 6, 1),
            imported_at=datetime.utcnow() - timedelta(days=2),
            checksum=f"SHA256-{p_id}-RECORD",
            metadata_json={"tehsil": "Girwa", "khasra": p_data["survey_number"]},
        )
        db.add(doc_rec)

        # Historical Cadastral Versions (1998, 2015, 2024, 2026)
        versions_to_add = [
            ("1998_CADASTRAL", "Rajasthan Revenue Settlement 1998", datetime(1998, 4, 1), p_data["official_area_m2"], "Official Settlement Survey Baseline"),
            ("2015_REVENUE_UPDATE", "Tehsil Land Record Revision 2015", datetime(2015, 10, 15), p_data["official_area_m2"], "Subdivision & Mutation Record Update"),
            ("2024_DRONE_PILOT", "BhoomiSync Drone Acquisition Phase 1", datetime(2024, 3, 20), p_data.get("drone_measured_area_m2") or p_data["official_area_m2"], "High Resolution Aerial Survey Baseline"),
            ("2026_DRONE_RESURVEY", "BhoomiSync Drone Resurvey 2026", datetime(2026, 2, 1), p_data.get("drone_measured_area_m2") or p_data["official_area_m2"], "Centimeter-Accurate RTK / LiDAR Drone Resurvey"),
        ]
        for v_num, v_src, v_eff, v_area, v_reason in versions_to_add:
            c_ver = CadastralVersion(
                parcel_id=parcel.id,
                version_number=v_num,
                geometry=p_data["cadastral_geometry"],
                source=v_src,
                effective_date=v_eff,
                captured_date=v_eff,
                area_m2=v_area,
                created_by="REVENUE_SETTLEMENT_OFFICER",
                change_reason=v_reason,
                created_at=datetime.utcnow() - timedelta(days=2),
            )
            db.add(c_ver)

        # Attach Associated Parcel Documents
        docs_to_add = [
            (f"DOC-OWN-{idx:03d}", f"Jamabandi Title Certificate — Khasra {p_data['survey_number']}", "OWNERSHIP_RECORD", "PDF", f"documents/{p_id}/jamabandi.pdf", 48200),
            (f"DOC-MAP-{idx:03d}", f"Official Bhunaksha Cadastral Map Sheet", "CADASTRAL_MAP", "GEOJSON", f"documents/{p_id}/bhunaksha.geojson", 12400),
            (f"DOC-SRV-{idx:03d}", f"Drone Measurement & Geodesic Calculation Sheet", "SURVEY_DOCUMENT", "PDF", f"documents/{p_id}/survey_report.pdf", 96500),
        ]
        for d_id, d_title, d_type, d_fmt, d_path, d_size in docs_to_add:
            p_doc = ParcelDocument(
                document_id=d_id,
                parcel_id=parcel.id,
                title=d_title,
                document_type=d_type,
                file_format=d_fmt,
                storage_path=d_path,
                file_size_bytes=d_size,
                checksum=f"SHA256-{d_id}",
                source="Sub-Registrar Office / Tehsil Record Room",
                upload_date=datetime.utcnow() - timedelta(days=2),
                metadata_json={"survey_number": p_data["survey_number"], "verified": True},
            )
            db.add(p_doc)

        # Seed intentional parcel change records for special parcels (BS-P-005, BS-P-010, BS-P-014)
        if p_id == "BS-P-005":
            chg = ParcelChangeRecord(
                change_record_id="PCR-BS-P-005-01",
                parcel_id=parcel.id,
                change_type="POTENTIAL_ENCROACHMENT",
                severity="CRITICAL_ENCROACHMENT",
                old_geometry=p_data["cadastral_geometry"],
                new_geometry=p_data.get("current_geometry"),
                area_difference_m2=-142.5,
                boundary_shift_m=3.2,
                confidence=0.94,
                detection_job_id="JOB-AI-CHANGE-001",
                verification_status="PENDING_SURVEYOR",
                surveyor_comment="New Unauthorized Concrete Enclosure detected on western buffer (Khasra 104/2).",
                created_at=datetime.utcnow() - timedelta(days=1),
            )
            db.add(chg)
        elif p_id == "BS-P-010":
            chg = ParcelChangeRecord(
                change_record_id="PCR-BS-P-010-01",
                parcel_id=parcel.id,
                change_type="BOUNDARY_DISPLACEMENT",
                severity="MEDIUM",
                old_geometry=p_data["cadastral_geometry"],
                new_geometry=p_data.get("current_geometry"),
                area_difference_m2=-88.0,
                boundary_shift_m=1.8,
                confidence=0.89,
                detection_job_id="JOB-AI-CHANGE-002",
                verification_status="PENDING_SURVEYOR",
                surveyor_comment="Historical 1998 boundary shifted 1.8m westward along modern ridge bund.",
                created_at=datetime.utcnow() - timedelta(days=1),
            )
            db.add(chg)
        elif p_id == "BS-P-014":
            chg = ParcelChangeRecord(
                change_record_id="PCR-BS-P-014-01",
                parcel_id=parcel.id,
                change_type="NEW_STRUCTURE",
                severity="HIGH",
                old_geometry=p_data["cadastral_geometry"],
                new_geometry=p_data.get("current_geometry"),
                area_difference_m2=-64.0,
                boundary_shift_m=1.2,
                confidence=0.93,
                detection_job_id="JOB-AI-CHANGE-003",
                verification_status="PENDING_SURVEYOR",
                surveyor_comment="New 64m² Solar Irrigation Pump Shed detected in open agricultural field.",
                created_at=datetime.utcnow() - timedelta(days=1),
            )
            db.add(chg)

    db.commit()


def _seed_auth_and_rbac(db: Session) -> None:
    """
    Initializes canonical RBAC roles, granular permissions, role bindings,
    and seed demo user accounts.
    """
    from app.models.auth.models import User, Role, Permission
    from app.modules.auth.permissions import ALL_PERMISSIONS_METADATA, ROLE_PERMISSIONS_MAP
    from app.modules.auth.password_service import PasswordService

    # 1. Seed Roles
    roles_dict = {}
    for r_name in ["PUBLIC", "SURVEYOR", "GOVERNMENT_OFFICIAL", "ADMIN"]:
        role = db.query(Role).filter(Role.name == r_name).first()
        if not role:
            desc = {
                "PUBLIC": "Citizen and public view access",
                "SURVEYOR": "Field surveyor and drone survey operations",
                "GOVERNMENT_OFFICIAL": "Tehsildar and revenue administration",
                "ADMIN": "BhoomiSync system administrator",
            }.get(r_name, f"{r_name} role")
            role = Role(name=r_name, description=desc, is_system_role=True)
            db.add(role)
            db.commit()
            db.refresh(role)
        roles_dict[r_name] = role

    # 2. Seed Permissions
    perms_dict = {}
    for p_meta in ALL_PERMISSIONS_METADATA:
        perm = db.query(Permission).filter(Permission.name == p_meta["name"]).first()
        if not perm:
            perm = Permission(
                name=p_meta["name"],
                description=p_meta["description"],
                resource_type=p_meta["resource_type"],
            )
            db.add(perm)
            db.commit()
            db.refresh(perm)
        perms_dict[p_meta["name"]] = perm

    # 3. Bind Role-Permissions
    for r_name, perm_names in ROLE_PERMISSIONS_MAP.items():
        role = roles_dict.get(r_name)
        if not role:
            continue
        existing_perm_ids = {p.id for p in role.permissions}
        for p_name in perm_names:
            perm = perms_dict.get(p_name)
            if perm and perm.id not in existing_perm_ids:
                role.permissions.append(perm)
        db.commit()

    # 4. Seed Demo Users
    demo_users = [
        {
            "username": "admin",
            "email": "admin@bhoomisync.demo",
            "password": "AdminPassword@2026",
            "full_name": "BhoomiSync Administrator",
            "role": "ADMIN",
            "phone": "+91 98290 00001",
        },
        {
            "username": "surveyor",
            "email": "surveyor@bhoomisync.demo",
            "password": "SurveyorPassword@2026",
            "full_name": "Vikram Singh (Cadastral Surveyor)",
            "role": "SURVEYOR",
            "phone": "+91 98290 00002",
        },
        {
            "username": "official",
            "email": "official@bhoomisync.demo",
            "password": "OfficialPassword@2026",
            "full_name": "Sunita Sharma (Tehsildar Girwa)",
            "role": "GOVERNMENT_OFFICIAL",
            "phone": "+91 98290 00003",
        },
        {
            "username": "citizen",
            "email": "citizen@bhoomisync.demo",
            "password": "CitizenPassword@2026",
            "full_name": "Ramesh Chandra Patel (Khatedar)",
            "role": "PUBLIC",
            "phone": "+91 98290 00004",
        },
    ]

    for u_data in demo_users:
        user = db.query(User).filter(User.username == u_data["username"]).first()
        if not user:
            user = User(
                user_id=f"USR-DEMO-{u_data['role'][:3]}-001",
                username=u_data["username"],
                email=u_data["email"],
                password_hash=PasswordService.hash_password(u_data["password"]),
                full_name=u_data["full_name"],
                phone_reference=u_data["phone"],
                is_active=True,
                is_verified=True,
                created_at=datetime.utcnow() - timedelta(days=30),
            )
            role = roles_dict.get(u_data["role"])
            if role:
                user.roles.append(role)
            db.add(user)
            db.commit()


def _seed_reports_for_survey(db: Session, survey: Survey) -> None:
    """
    Seeds initial realistic digital survey reports for Haripura Village parcels.
    Demonstrates:
    - Khasra 101: APPROVED official report with full exports
    - Khasra 102: UNDER_REVIEW report
    - Khasra 103: DRAFT / GENERATED report
    """
    from app.modules.reporting.services.report_service import ReportService
    from app.modules.reporting.schemas.report_schemas import ReportCreatePayload
    from app.models.reports import ReportStatus, ReportType
    from app.models.auth import User

    # Check if reports already exist
    from app.models.reports import SurveyReport
    if db.query(SurveyReport).first():
        return

    admin_user = db.query(User).filter(User.username == "admin").first()
    surveyor_user = db.query(User).filter(User.username == "surveyor").first()


    # 1. Khasra 101: Approved Final Survey Report
    p101_payload = ReportCreatePayload(
        survey_id=survey.id,
        parcel_id="BS-P-001",
        report_type=ReportType.CADASTRAL_SURVEY,
        title="Haripura Village Pilot - Khasra #101 Comprehensive Cadastral Survey Report",
        summary="Complete multi-sensor cadastral dossier for Khasra 101. Fully verified with Ground Control Points and official Jamabandi.",
        preferred_unit="m2",
    )
    r1 = ReportService.create_draft_report(db, p101_payload, surveyor_user)
    r1 = ReportService.generate_report(db, r1.report_id, surveyor_user)
    r1 = ReportService.submit_for_review(db, r1.report_id, "Field boundary verified. Recommended for final mutation sign-off.", surveyor_user)
    r1 = ReportService.approve_report(db, r1.report_id, "Sunita Sharma (Tehsildar Girwa)", "Approved in accordance with Rajasthan Land Revenue Act.", admin_user)

    # 2. Khasra 102: Under Review Report
    p102_payload = ReportCreatePayload(
        survey_id=survey.id,
        parcel_id="BS-P-002",
        report_type=ReportType.BOUNDARY_VERIFICATION,
        title="Haripura Village Pilot - Khasra #102 Boundary Verification Report",
        summary="Aerial boundary alignment dossier for Khasra 102. Under administrative review.",
        preferred_unit="hectares",
    )
    r2 = ReportService.create_draft_report(db, p102_payload, surveyor_user)
    r2 = ReportService.generate_report(db, r2.report_id, surveyor_user)
    r2 = ReportService.submit_for_review(db, r2.report_id, "GCP verification completed. Submitted for review.", surveyor_user)

    # 3. Khasra 103: Draft Report
    p103_payload = ReportCreatePayload(
        survey_id=survey.id,
        parcel_id="BS-P-003",
        report_type=ReportType.CADASTRAL_SURVEY,
        title="Haripura Village Pilot - Khasra #103 Preliminary Survey Dossier",
        summary="Preliminary drone LiDAR and photogrammetry snapshot for Khasra 103.",
        preferred_unit="acres",
    )
    r3 = ReportService.create_draft_report(db, p103_payload, surveyor_user)
    r3 = ReportService.generate_report(db, r3.report_id, surveyor_user)


def _seed_drone_missions(db: Session, survey: Survey) -> None:
    """Seeds demo Drone fleet, active and completed survey flight missions with telemetry & sensor assets."""
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
    from app.modules.drone_ingestion.services.ingestion_service import IngestionService
    from app.modules.drone_ingestion.services.processing_trigger_service import ProcessingTriggerService

    # 1. Seed Drone Fleet
    d1 = IngestionService.get_or_create_drone(db, "DRONE-001", "BhoomiSky Matrice 350 RTK")
    d1.status = DroneStatus.CONNECTED
    d1.battery_percent = 92.4
    d1.meta_info = {"payload": "Sony ILX-LR1 61MP + Hesai XT32 LiDAR", "cellular": "5G SA RTK"}

    d2 = IngestionService.get_or_create_drone(db, "DRONE-002", "BhoomiScout VTOL Explorer")
    d2.status = DroneStatus.IDLE
    d2.battery_percent = 100.0

    # 2. Seed Completed Reference Mission: MIS-2026-HARIPURA-001
    m1 = DroneMission(
        mission_id="MIS-2026-HARIPURA-001",
        mission_name="Haripura Cadastral Primary Aerial Survey",
        survey_id=survey.survey_id,
        drone_id="DRONE-001",
        status=MissionStatus.COMPLETED,
        started_at=datetime.utcnow() - timedelta(hours=3),
        ended_at=datetime.utcnow() - timedelta(hours=2),
        last_data_at=datetime.utcnow() - timedelta(hours=2),
        total_objects=30,
        processed_objects=30,
        failed_objects=0,
        total_bytes=104857600,  # 100 MB
        meta_info={"ground_sampling_distance_cm": 1.2, "overlap_forward_percent": 80, "overlap_side_percent": 75},
    )
    db.add(m1)
    db.commit()

    # Stages for m1 (all 11 completed)
    stages = ProcessingTriggerService.initialize_mission_stages(db, m1.mission_id)
    for s in stages:
        s.status = JobStageStatus.COMPLETED
        s.progress = 100.0
        s.started_at = datetime.utcnow() - timedelta(hours=2, minutes=50)
        s.completed_at = datetime.utcnow() - timedelta(hours=2, minutes=5)
    db.commit()

    # Seed 15 telemetry points for m1
    base_lat = 24.5840
    base_lon = 73.7120
    for i in range(15):
        t = TelemetryRecord(
            mission_id=m1.mission_id,
            timestamp=datetime.utcnow() - timedelta(hours=2, minutes=45 - i),
            latitude=base_lat + (i * 0.0003),
            longitude=base_lon + ((i % 5) * 0.0006),
            altitude=120.0 + (math.sin(i) * 2.0),
            heading=90.0 if (i // 5) % 2 == 0 else 270.0,
            pitch=-2.0,
            roll=0.5,
            rtk_status="FIXED_RTK",
            satellites=18,
            hdop=0.7,
            speed=9.5,
            battery_percent=max(20.0, 95.0 - (i * 4.5)),
            sequence_number=i + 1,
        )
        db.add(t)

    # Seed 8 RGB and 4 LiDAR sensor objects for m1
    for i in range(8):
        obj = SensorDataObject(
            mission_id=m1.mission_id,
            survey_id=survey.survey_id,
            sensor_type=SensorDataType.RGB,
            object_key=f"surveys/{survey.survey_id}/missions/{m1.mission_id}/raw/rgb/frame_{i+1:06d}.jpg",
            filename=f"frame_{i+1:06d}.jpg",
            content_type="image/jpeg",
            size_bytes=6291456,  # 6 MB
            sha256=f"a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef{i}",
            sequence_number=i + 1,
            status=ObjectStatus.PROCESSED,
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=45 - i),
            processed_at=datetime.utcnow() - timedelta(hours=2, minutes=10),
        )
        db.add(obj)

    for i in range(4):
        obj = SensorDataObject(
            mission_id=m1.mission_id,
            survey_id=survey.survey_id,
            sensor_type=SensorDataType.LIDAR,
            object_key=f"surveys/{survey.survey_id}/missions/{m1.mission_id}/raw/lidar/scan_chunk_{i+1:04d}.las",
            filename=f"scan_chunk_{i+1:04d}.las",
            content_type="application/octet-stream",
            size_bytes=12582912,  # 12 MB
            sha256=f"f9e8d7c6b5a40321fedcba98765432100123456789abcdef0123456789abcdef{i}",
            sequence_number=i + 1,
            status=ObjectStatus.PROCESSED,
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=40 - (i * 2)),
            processed_at=datetime.utcnow() - timedelta(hours=2, minutes=10),
        )
        db.add(obj)

    # 3. Seed Active Reference Mission: MIS-2026-HARIPURA-002
    m2 = DroneMission(
        mission_id="MIS-2026-HARIPURA-002",
        mission_name="Haripura Northern Sector LiDAR Reconnaissance",
        survey_id=survey.survey_id,
        drone_id="DRONE-001",
        status=MissionStatus.RECEIVING_DATA,
        started_at=datetime.utcnow() - timedelta(minutes=15),
        last_data_at=datetime.utcnow() - timedelta(seconds=2),
        total_objects=12,
        processed_objects=0,
        failed_objects=0,
        total_bytes=41943040,  # 40 MB
        meta_info={"sensor_mode": "RGB_LIDAR_FUSION"},
    )
    db.add(m2)
    db.commit()

    stages2 = ProcessingTriggerService.initialize_mission_stages(db, m2.mission_id)
    stages2[0].status = JobStageStatus.RUNNING
    stages2[0].progress = 65.0
    stages2[0].started_at = datetime.utcnow() - timedelta(minutes=5)
    db.commit()






