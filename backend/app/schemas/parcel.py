from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.parcel import LandUseType, ParcelSource, VerificationStatus, ParcelAuditAction


class ParcelBase(BaseModel):
    geometry_geojson: Dict[str, Any]
    land_use: LandUseType = LandUseType.AGRICULTURAL_CROP
    source: ParcelSource = ParcelSource.AI_SEGMENTATION
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    verification_status: VerificationStatus = VerificationStatus.AI_DETECTED
    attributes_json: Dict[str, Any] = Field(default_factory=dict)


class ParcelCreate(ParcelBase):
    parcel_id: Optional[str] = None
    survey_id: int
    dataset_id: Optional[int] = None


class ParcelUpdateGeometry(BaseModel):
    new_geometry_geojson: Dict[str, Any]
    editor_id: str = "surveyor_01"
    comment: Optional[str] = "Manual boundary adjustment"


class ParcelUpdateStatus(BaseModel):
    verification_status: VerificationStatus
    editor_id: str = "surveyor_01"
    comment: Optional[str] = None


class ParcelAuditLogSchema(BaseModel):
    id: int
    parcel_id: int
    version: int
    action: ParcelAuditAction
    previous_geometry_geojson: Optional[Dict[str, Any]] = None
    new_geometry_geojson: Dict[str, Any]
    editor_id: str
    comment: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class ParcelDetail(BaseModel):
    id: int
    parcel_id: str
    survey_id: int
    dataset_id: Optional[int] = None
    geometry_geojson: Dict[str, Any]
    area_m2: float
    area_hectares: float = 0.0
    perimeter_m: float
    centroid_lat: float
    centroid_lon: float
    land_use: LandUseType
    source: ParcelSource
    confidence: float
    verification_status: VerificationStatus
    version: int
    attributes_json: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
