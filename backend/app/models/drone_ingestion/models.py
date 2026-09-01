import enum
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Enum as SQLEnum,
    JSON,
    BigInteger,
    Index,
    Text,
)
from sqlalchemy.orm import relationship
from app.db.session import Base


class DroneStatus(str, enum.Enum):
    IDLE = "IDLE"
    CONNECTED = "CONNECTED"
    TRANSMITTING = "TRANSMITTING"
    RETURNING = "RETURNING"
    OFFLINE = "OFFLINE"
    MAINTENANCE = "MAINTENANCE"


class MissionStatus(str, enum.Enum):
    INITIALIZED = "INITIALIZED"
    ACTIVE = "ACTIVE"
    RECEIVING_DATA = "RECEIVING_DATA"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class SensorDataType(str, enum.Enum):
    RGB = "RGB"
    LIDAR = "LIDAR"
    GNSS = "GNSS"
    IMU = "IMU"
    TELEMETRY = "TELEMETRY"


class ObjectStatus(str, enum.Enum):
    PENDING_UPLOAD = "PENDING_UPLOAD"
    UPLOADED = "UPLOADED"
    VERIFIED = "VERIFIED"
    CORRUPTED = "CORRUPTED"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"


class JobStageStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"


class Drone(Base):
    """
    Physical or Simulated Drone Hardware Registry.
    Tracks aerial survey drones, camera/LiDAR payloads, status, and last connectivity.
    """
    __tablename__ = "drones"

    id = Column(Integer, primary_key=True, index=True)
    drone_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    model = Column(String(128), default="DJI Matrice 350 RTK / Custom ESP32")
    status = Column(SQLEnum(DroneStatus), default=DroneStatus.IDLE, nullable=False)
    battery_percent = Column(Float, default=100.0)
    firmware_version = Column(String(64), default="v2.4.1-bhoomi")
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=True)
    meta_info = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    missions = relationship("DroneMission", back_populates="drone", cascade="all, delete-orphan")


class DroneMission(Base):
    """
    Real-Time Drone Survey Flight Mission.
    Tracks high-frequency sensor streaming, presigned upload URLs, and processing lifecycle.
    """
    __tablename__ = "drone_missions"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(String(64), unique=True, index=True, nullable=False)
    mission_name = Column(String(255), nullable=False)
    survey_id = Column(String(64), nullable=False, index=True)  # Links to Survey campaign
    drone_id = Column(String(64), ForeignKey("drones.drone_id"), nullable=False, index=True)

    status = Column(SQLEnum(MissionStatus), default=MissionStatus.INITIALIZED, nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    last_data_at = Column(DateTime, nullable=True)

    total_objects = Column(Integer, default=0, nullable=False)
    processed_objects = Column(Integer, default=0, nullable=False)
    failed_objects = Column(Integer, default=0, nullable=False)
    total_bytes = Column(BigInteger, default=0, nullable=False)

    meta_info = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    drone = relationship("Drone", back_populates="missions")
    sensor_objects = relationship("SensorDataObject", back_populates="mission", cascade="all, delete-orphan")
    telemetry_records = relationship("TelemetryRecord", back_populates="mission", cascade="all, delete-orphan")
    stages = relationship("ProcessingJobStage", back_populates="mission", cascade="all, delete-orphan")


class SensorDataObject(Base):
    """
    Granular Drone Sensor Ingestion Asset.
    Indexes individual RGB frames, LiDAR LAS chunks, GNSS logs, and IMU data stored in Cloudflare R2.
    """
    __tablename__ = "sensor_data_objects"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(String(64), ForeignKey("drone_missions.mission_id"), nullable=False, index=True)
    survey_id = Column(String(64), nullable=False, index=True)
    sensor_type = Column(SQLEnum(SensorDataType), nullable=False, index=True)
    
    object_key = Column(String(512), unique=True, index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(128), default="application/octet-stream", nullable=False)
    size_bytes = Column(BigInteger, default=0, nullable=False)
    sha256 = Column(String(64), nullable=False, index=True)
    
    capture_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    sequence_number = Column(Integer, default=0, nullable=False, index=True)
    
    status = Column(SQLEnum(ObjectStatus), default=ObjectStatus.PENDING_UPLOAD, nullable=False, index=True)
    retry_count = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    meta_info = Column(JSON, default=dict, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)

    # Composite index for idempotency
    __table_args__ = (
        Index("ix_sensor_obj_idempotency", "mission_id", "sensor_type", "sequence_number"),
    )

    mission = relationship("DroneMission", back_populates="sensor_objects")


class TelemetryRecord(Base):
    """
    High-Frequency Drone Flight Telemetry Point.
    Streams real-time position, speed, heading, RTK fix quality, and battery metrics.
    """
    __tablename__ = "telemetry_records"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(String(64), ForeignKey("drone_missions.mission_id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float, default=0.0, nullable=False)
    
    heading = Column(Float, default=0.0)
    pitch = Column(Float, default=0.0)
    roll = Column(Float, default=0.0)
    
    rtk_status = Column(String(32), default="FIXED_RTK", nullable=False)
    satellites = Column(Integer, default=14)
    hdop = Column(Float, default=0.8)
    speed = Column(Float, default=0.0)
    battery_percent = Column(Float, default=100.0)
    sequence_number = Column(Integer, default=0, nullable=False, index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_telemetry_mission_seq", "mission_id", "sequence_number"),
    )

    mission = relationship("DroneMission", back_populates="telemetry_records")


class ProcessingJobStage(Base):
    """
    Mission Downstream Pipeline Stage (Stages 1 through 11).
    Tracks end-to-end processing execution across Prompts 2-3-4-5-7.
    """
    __tablename__ = "processing_job_stages"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), nullable=False, index=True)
    mission_id = Column(String(64), ForeignKey("drone_missions.mission_id"), nullable=False, index=True)
    
    stage_number = Column(Integer, nullable=False)  # 1 to 11
    stage_name = Column(String(128), nullable=False)
    status = Column(SQLEnum(JobStageStatus), default=JobStageStatus.QUEUED, nullable=False)
    progress = Column(Float, default=0.0)  # 0.0 to 100.0
    
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    mission = relationship("DroneMission", back_populates="stages")
