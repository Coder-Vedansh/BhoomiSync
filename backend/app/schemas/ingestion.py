from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.ingestion import SensorType, SessionStatus, FileStatus, JobType, JobStatus


# Sensor Schemas
class SensorCreate(BaseModel):
    sensor_id: str = Field(..., json_schema_extra={"example": "SENSOR-RGB-SONY-01"})
    name: str = Field(..., json_schema_extra={"example": "Sony RX0 II Survey Camera"})
    sensor_type: SensorType = Field(default=SensorType.CAMERA)
    model: Optional[str] = "DSC-RX0M2"
    serial_number: Optional[str] = None
    specifications_json: Dict[str, Any] = Field(default_factory=dict)


class SensorSummary(BaseModel):
    id: int
    sensor_id: str
    name: str
    sensor_type: SensorType
    model: Optional[str] = None
    serial_number: Optional[str] = None
    specifications_json: Dict[str, Any]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Upload Session Schemas
class UploadSessionCreate(BaseModel):
    survey_id: int
    device_id: str = Field(default="ESP32-HARIPURA-PROTO-01")
    gateway_type: str = Field(default="ESP32_PHONE")
    meta_info: Dict[str, Any] = Field(default_factory=dict)


class UploadSessionSummary(BaseModel):
    id: int
    session_id: str
    survey_id: int
    device_id: str
    gateway_type: str
    status: SessionStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    total_files: int
    uploaded_files: int
    failed_files: int
    total_bytes: int
    uploaded_bytes: int
    meta_info: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UploadSessionDetail(UploadSessionSummary):
    progress_percentage: float = 0.0


# Uploaded File Schemas
class UploadedFileSummary(BaseModel):
    id: int
    file_id: str
    session_id: Optional[int] = None
    survey_id: int
    dataset_id: Optional[int] = None
    sensor_id: Optional[int] = None
    filename: str
    file_format: str
    file_size_bytes: int
    mime_type: str
    checksum_sha256: str
    storage_provider: str
    storage_key: str
    is_duplicate: bool
    duplicate_of_file_id: Optional[str] = None
    upload_status: FileStatus
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    gps_accuracy: Optional[float] = None
    rtk_fix_status: Optional[str] = None
    satellite_count: Optional[int] = None
    capture_timestamp: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UploadedFileDetail(UploadedFileSummary):
    exif_metadata_json: Dict[str, Any] = Field(default_factory=dict)
    lidar_metadata_json: Dict[str, Any] = Field(default_factory=dict)
    validation_errors: List[Any] = Field(default_factory=list)


# Position Record Schema
class PositionRecordSchema(BaseModel):
    id: int
    session_id: Optional[int] = None
    survey_id: int
    latitude: float
    longitude: float
    altitude: float
    accuracy_horizontal_m: Optional[float] = None
    accuracy_vertical_m: Optional[float] = None
    fix_status: str
    satellite_count: int
    hdop: Optional[float] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# Processing Job Schema
class ProcessingJobSchema(BaseModel):
    id: int
    job_id: str
    job_type: JobType
    file_id: Optional[int] = None
    dataset_id: Optional[int] = None
    survey_id: int
    status: JobStatus
    progress_percentage: float
    error_message: Optional[str] = None
    parameters_json: Dict[str, Any]
    result_json: Dict[str, Any]
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Spatial Footprint GeoJSON Schema for GIS Map
class SpatialFootprintResponse(BaseModel):
    survey_id: str
    camera_points_geojson: Dict[str, Any]
    lidar_footprint_geojson: Dict[str, Any]
    rtk_trajectory_geojson: Dict[str, Any]
    total_images_mapped: int
    total_lidar_files_mapped: int
    total_trajectory_points: int
