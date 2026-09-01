from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.drone_ingestion.models import (
    DroneStatus,
    MissionStatus,
    SensorDataType,
    ObjectStatus,
    JobStageStatus,
)


class DroneBase(BaseModel):
    drone_id: str = Field(..., description="Unique drone hardware identifier")
    name: str = Field(..., description="Human readable drone name")
    model: str = Field(default="DJI Matrice 350 RTK / Custom ESP32")
    status: DroneStatus = Field(default=DroneStatus.IDLE)
    battery_percent: float = Field(default=100.0)
    firmware_version: str = Field(default="v2.4.1-bhoomi")
    meta_info: Dict[str, Any] = Field(default_factory=dict)


class DroneResponse(DroneBase):
    id: int
    last_seen: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DroneMissionCreateRequest(BaseModel):
    drone_id: str = Field(default="DRONE-001", description="Identifier of registered drone")
    mission_name: str = Field(..., description="Mission operational name")
    survey_id: str = Field(default="SURVEY-2026-001", description="Associated Survey Campaign ID")
    meta_info: Dict[str, Any] = Field(default_factory=dict)


class ProcessingStageDTO(BaseModel):
    stage_number: int
    stage_name: str
    status: JobStageStatus
    progress: float
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class DroneMissionResponse(BaseModel):
    id: int
    mission_id: str
    mission_name: str
    survey_id: str
    drone_id: str
    status: MissionStatus
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    last_data_at: Optional[datetime] = None
    total_objects: int = 0
    processed_objects: int = 0
    failed_objects: int = 0
    total_bytes: int = 0
    meta_info: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime
    stages: List[ProcessingStageDTO] = []

    class Config:
        from_attributes = True


class UploadUrlRequest(BaseModel):
    mission_id: str = Field(..., description="Active drone survey mission ID")
    sensor_type: SensorDataType = Field(..., description="Sensor modality: RGB, LIDAR, GNSS, IMU, TELEMETRY")
    filename: str = Field(..., description="Original sensor payload filename (e.g. frame_000001.jpg)")
    content_type: str = Field(default="application/octet-stream", description="MIME content type")


class UploadUrlResponse(BaseModel):
    upload_url: str = Field(..., description="Secure presigned R2/S3 PUT upload URL")
    object_key: str = Field(..., description="Deterministic R2 object storage key")
    expires_in: int = Field(default=900, description="Expiration in seconds")
    bucket: str = Field(..., description="Destination Cloudflare R2 bucket name")


class UploadCompleteRequest(BaseModel):
    mission_id: str = Field(..., description="Active drone survey mission ID")
    object_key: str = Field(..., description="R2 object storage key")
    sensor_type: SensorDataType = Field(..., description="Sensor modality: RGB, LIDAR, GNSS, IMU, TELEMETRY")
    size_bytes: int = Field(..., ge=0, description="Payload size in bytes")
    sha256: str = Field(..., min_length=64, max_length=64, description="Calculated SHA-256 hex digest")
    capture_timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)
    sequence_number: int = Field(default=0, ge=0, description="Sequential frame or batch sequence index")
    meta_info: Dict[str, Any] = Field(default_factory=dict)


class UploadCompleteResponse(BaseModel):
    success: bool = True
    message: str
    object_id: int
    object_key: str
    sensor_type: SensorDataType
    status: ObjectStatus
    sha256: str
    is_duplicate: bool = False
    processing_triggered: bool = True


class TelemetryIngestRequest(BaseModel):
    mission_id: str = Field(..., description="Active mission identifier")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    altitude: float = Field(default=0.0)
    heading: float = Field(default=0.0, ge=0.0, le=360.0)
    pitch: float = Field(default=0.0)
    roll: float = Field(default=0.0)
    rtk_status: str = Field(default="FIXED_RTK")
    satellites: int = Field(default=14, ge=0)
    hdop: float = Field(default=0.8)
    speed: float = Field(default=0.0)
    battery_percent: float = Field(default=100.0, ge=0.0, le=100.0)
    sequence_number: int = Field(default=0, ge=0)


class TelemetryRecordResponse(BaseModel):
    id: int
    mission_id: str
    timestamp: datetime
    latitude: float
    longitude: float
    altitude: float
    heading: float
    pitch: float
    roll: float
    rtk_status: str
    satellites: int
    hdop: float
    speed: float
    battery_percent: float
    sequence_number: int

    class Config:
        from_attributes = True


class MissionHealthResponse(BaseModel):
    mission_status: MissionStatus
    drone_connected: bool
    last_telemetry_seconds: float
    upload_rate_mbps: float
    objects_received: int
    processing_queue: int
    failed_objects: int
    storage_size_bytes: int
    rtk_fix_rate: float
    current_stage: Optional[str] = None
    overall_progress: float = 0.0


class SimulatorStartRequest(BaseModel):
    mission_id: Optional[str] = None
    survey_id: str = Field(default="SURVEY-2026-001")
    drone_id: str = Field(default="DRONE-001")
    speed_factor: float = Field(default=1.0, ge=0.1, le=10.0)
    total_frames: int = Field(default=30, ge=5, le=500)
    include_lidar: bool = True
    include_rgb: bool = True


class SimulatorStatusResponse(BaseModel):
    is_running: bool
    mission_id: Optional[str] = None
    frames_sent: int = 0
    total_frames: int = 0
    current_lat: float = 24.5853
    current_lon: float = 73.7132
    current_alt: float = 120.0
    battery: float = 100.0
    status: str = "IDLE"
