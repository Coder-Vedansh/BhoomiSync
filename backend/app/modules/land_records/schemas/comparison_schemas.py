from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class AreaUnitsDTO(BaseModel):
    sq_meters: float
    hectares: float
    acres: float


class AreaComparisonResponse(BaseModel):
    parcel_id: str
    survey_number: str
    village: str
    
    # 4-Way Area Comparisons
    official_area: AreaUnitsDTO
    drone_area: Optional[AreaUnitsDTO] = None
    historical_area: Optional[AreaUnitsDTO] = None
    verified_area: Optional[AreaUnitsDTO] = None
    
    # Mathematical Differences (Official vs Drone)
    area_difference_m2: Optional[float] = None
    percentage_difference: Optional[float] = None
    perimeter_official_m: Optional[float] = None
    perimeter_drone_m: Optional[float] = None
    perimeter_difference_m: Optional[float] = None
    
    # Spatial Relationship
    boundary_displacement_max_m: Optional[float] = None
    centroid_displacement_m: Optional[float] = None
    overlap_percentage: Optional[float] = None
    
    classification_status: str  # NO_SIGNIFICANT_CHANGE, MINOR_DISCREPANCY, SIGNIFICANT_DISCREPANCY, POTENTIAL_ENCROACHMENT
    explanation: str


class CadastralVersionDTO(BaseModel):
    id: int
    version_number: str
    geometry: Dict[str, Any]
    source: str
    effective_date: datetime
    captured_date: Optional[datetime] = None
    area_m2: float
    area_hectares: float
    created_by: str
    change_reason: Optional[str] = None


class ParcelChangeRecordDTO(BaseModel):
    id: int
    change_record_id: str
    parcel_id: int
    change_type: str
    severity: str
    old_geometry: Optional[Dict[str, Any]] = None
    new_geometry: Optional[Dict[str, Any]] = None
    area_difference_m2: float
    boundary_shift_m: float
    confidence: float
    detection_job_id: Optional[str] = None
    verification_status: str
    surveyor_comment: Optional[str] = None
    created_at: datetime


class ParcelDocumentDTO(BaseModel):
    id: int
    document_id: str
    parcel_id: int
    title: str
    document_type: str
    file_format: str
    storage_path: str
    file_size_bytes: int
    checksum: Optional[str] = None
    source: str
    upload_date: datetime
    metadata_json: Dict[str, Any] = {}
