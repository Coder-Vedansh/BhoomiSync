import enum
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Enum,
    ForeignKey,
    BigInteger,
    Boolean,
    Float,
    JSON,
    Text,
    Index
)
from sqlalchemy.orm import relationship
from app.db.base import Base


class SensorType(str, enum.Enum):
    CAMERA = "CAMERA"
    LIDAR = "LIDAR"
    RTK_GPS = "RTK_GPS"
    IMU = "IMU"
    MULTISPECTRAL = "MULTISPECTRAL"
    THERMAL = "THERMAL"
    OTHER = "OTHER"


class SessionStatus(str, enum.Enum):
    CREATED = "CREATED"
    UPLOADING = "UPLOADING"
    PARTIAL = "PARTIAL"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class FileStatus(str, enum.Enum):
    PENDING = "PENDING"
    UPLOADING = "UPLOADING"
    UPLOADED = "UPLOADED"
    VALIDATED = "VALIDATED"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"


class JobType(str, enum.Enum):
    IMAGE_PREPROCESSING = "IMAGE_PREPROCESSING"
    LIDAR_PREPROCESSING = "LIDAR_PREPROCESSING"
    GEOREFERENCING = "GEOREFERENCING"
    GNSS_PROCESSING = "GNSS_PROCESSING"
    IMAGE_GEOREFERENCING = "IMAGE_GEOREFERENCING"
    LIDAR_GEOREFERENCING = "LIDAR_GEOREFERENCING"
    IMAGE_LIDAR_ALIGNMENT = "IMAGE_LIDAR_ALIGNMENT"
    IMAGE_LIDAR_FUSION = "IMAGE_LIDAR_FUSION"
    ORTHOMOSAIC_GENERATION = "ORTHOMOSAIC_GENERATION"
    DEM_GENERATION = "DEM_GENERATION"
    DSM_GENERATION = "DSM_GENERATION"
    BOUNDARY_DETECTION = "BOUNDARY_DETECTION"
    LAND_CLASSIFICATION = "LAND_CLASSIFICATION"
    CHANGE_DETECTION = "CHANGE_DETECTION"
    AREA_CALCULATION = "AREA_CALCULATION"
    AI_CLASSIFICATION = "AI_CLASSIFICATION"
    AI_SEGMENTATION = "AI_SEGMENTATION"
    AI_BOUNDARY_DETECTION = "AI_BOUNDARY_DETECTION"
    AI_LAND_USE_CLASSIFICATION = "AI_LAND_USE_CLASSIFICATION"
    AI_CHANGE_DETECTION = "AI_CHANGE_DETECTION"
    AI_MULTI_SENSOR_FUSION = "AI_MULTI_SENSOR_FUSION"


class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Sensor(Base):
    """
    Sensor & Hardware Payload Entity
    Decoupled hardware specification registry for drone sensors (Sony RX0 II, Livox Mid-360, u-blox F9P, etc.)
    """
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    sensor_type = Column(Enum(SensorType), nullable=False)
    model = Column(String(128), nullable=True)
    serial_number = Column(String(128), nullable=True)
    specifications_json = Column(JSON, default=dict, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    uploaded_files = relationship("UploadedFile", back_populates="sensor")


class UploadSession(Base):
    """
    Upload / Sync Session Entity
    Tracks continuous or batched streaming ingestion of survey files from mobile or onboard gateways.
    """
    __tablename__ = "upload_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, index=True, nullable=False)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False, index=True)
    
    device_id = Column(String(64), default="ESP32-PROTO-01", nullable=False)
    gateway_type = Column(String(64), default="ESP32_PHONE", nullable=False)
    status = Column(Enum(SessionStatus), default=SessionStatus.CREATED, nullable=False, index=True)
    
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True)
    
    total_files = Column(Integer, default=0, nullable=False)
    uploaded_files = Column(Integer, default=0, nullable=False)
    failed_files = Column(Integer, default=0, nullable=False)
    
    total_bytes = Column(BigInteger, default=0, nullable=False)
    uploaded_bytes = Column(BigInteger, default=0, nullable=False)
    
    meta_info = Column(JSON, default=dict, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    survey = relationship("Survey")
    files = relationship("UploadedFile", back_populates="session", cascade="all, delete-orphan")
    position_records = relationship("PositionRecord", back_populates="session", cascade="all, delete-orphan")


class UploadedFile(Base):
    """
    UploadedFile Entity
    Stores immutable references, cryptographic checksums, EXIF/LiDAR metadata, and lifecycles
    for every camera image, LiDAR file, and RTK GPS record ingested into BhoomiSync.
    """
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String(64), unique=True, index=True, nullable=False)
    session_id = Column(Integer, ForeignKey("upload_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id", ondelete="SET NULL"), nullable=True, index=True)

    filename = Column(String(255), nullable=False)
    file_format = Column(String(32), nullable=False)  # JPEG, PNG, LAS, LAZ, RINEX, JSON, CSV
    file_size_bytes = Column(BigInteger, default=0, nullable=False)
    mime_type = Column(String(128), nullable=False)
    checksum_sha256 = Column(String(64), nullable=False, index=True)
    
    storage_provider = Column(String(32), default="MOCK", nullable=False)
    storage_key = Column(String(512), index=True, nullable=False)
    
    is_duplicate = Column(Boolean, default=False, nullable=False)
    duplicate_of_file_id = Column(String(64), nullable=True)
    
    upload_status = Column(Enum(FileStatus), default=FileStatus.UPLOADED, nullable=False, index=True)

    # Geolocation / RTK positioning metadata
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    altitude = Column(Float, nullable=True)
    gps_accuracy = Column(Float, nullable=True)
    rtk_fix_status = Column(String(32), nullable=True)  # NO_FIX, FIX_3D, FLOAT_RTK, FIXED_RTK, DGPS
    satellite_count = Column(Integer, nullable=True)
    capture_timestamp = Column(DateTime, nullable=True)

    # Extracted Sensor Metadata
    exif_metadata_json = Column(JSON, default=dict, nullable=False)
    lidar_metadata_json = Column(JSON, default=dict, nullable=False)
    validation_errors = Column(JSON, default=list, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    session = relationship("UploadSession", back_populates="files")
    survey = relationship("Survey")
    dataset = relationship("Dataset")
    sensor = relationship("Sensor", back_populates="uploaded_files")
    processing_jobs = relationship("ProcessingJob", back_populates="file", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_uploaded_files_survey_status", "survey_id", "upload_status"),
        Index("ix_uploaded_files_checksum", "checksum_sha256"),
    )


class PositionRecord(Base):
    """
    PositionRecord Entity
    Stores high-frequency GNSS/RTK trajectory records streamed during survey missions.
    """
    __tablename__ = "position_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("upload_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False, index=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float, default=0.0, nullable=False)
    
    accuracy_horizontal_m = Column(Float, nullable=True)
    accuracy_vertical_m = Column(Float, nullable=True)
    fix_status = Column(String(32), default="FIXED_RTK", nullable=False)
    satellite_count = Column(Integer, default=12, nullable=False)
    hdop = Column(Float, nullable=True)

    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    session = relationship("UploadSession", back_populates="position_records")
    survey = relationship("Survey")


class ProcessingJob(Base):
    """
    ProcessingJob Entity
    Modular asynchronous processing job queue triggered after ingestion and validation.
    """
    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), unique=True, index=True, nullable=False)
    job_type = Column(Enum(JobType), nullable=False, index=True)
    
    file_id = Column(Integer, ForeignKey("uploaded_files.id", ondelete="CASCADE"), nullable=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False, index=True)

    status = Column(Enum(JobStatus), default=JobStatus.QUEUED, nullable=False, index=True)
    progress_percentage = Column(Float, default=0.0, nullable=False)
    error_message = Column(Text, nullable=True)

    parameters_json = Column(JSON, default=dict, nullable=False)
    result_json = Column(JSON, default=dict, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    file = relationship("UploadedFile", back_populates="processing_jobs")
    dataset = relationship("Dataset")
    survey = relationship("Survey")
