from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.land_records import LandStatus, RecordStatus, VerificationStatus, MatchStatus


class LandParcelBase(BaseModel):
    parcel_id: str
    survey_number: str
    subdivision_number: Optional[str] = None
    state: str = "Rajasthan"
    district: str = "Udaipur"
    tehsil: str = "Girwa"
    village: str = "Haripura"
    land_record_source: str = "Rajasthan Revenue Department"
    official_area_m2: float
    official_area_hectares: float
    cadastral_geometry: Dict[str, Any]
    current_geometry: Optional[Dict[str, Any]] = None
    verified_geometry: Optional[Dict[str, Any]] = None
    geometry_source: str = "REVENUE_CADASTRAL_MAP"
    land_status: LandStatus = LandStatus.ACTIVE
    land_use: str = "AGRICULTURAL"
    ai_detected_land_use: Optional[str] = None
    classification_confidence: float = 0.92
    drone_measured_area_m2: Optional[float] = None
    verified_area_m2: Optional[float] = None
    historical_area_m2: Optional[float] = None
    ownership_status: str = "CLEAR_TITLED"
    record_status: RecordStatus = RecordStatus.OFFICIAL
    verification_status: VerificationStatus = VerificationStatus.PENDING
    match_status: MatchStatus = MatchStatus.MATCHED
    match_confidence: float = 0.95
    notes: Optional[str] = None


class LandParcelCreate(LandParcelBase):
    pass


# ------------------------------------------------------------------------------
# Role-Aware DTOs for Ownership Privacy
# ------------------------------------------------------------------------------

class PublicParcelDTO(BaseModel):
    """
    Public View DTO: Masked / Sanitized without private contact or owner details.
    """
    id: int
    parcel_id: str
    survey_number: str
    subdivision_number: Optional[str] = None
    village: str
    tehsil: str
    district: str
    state: str
    official_area_m2: float
    official_area_hectares: float
    drone_measured_area_m2: Optional[float] = None
    verified_area_m2: Optional[float] = None
    cadastral_geometry: Dict[str, Any]
    current_geometry: Optional[Dict[str, Any]] = None
    verified_geometry: Optional[Dict[str, Any]] = None
    land_use: str
    ai_detected_land_use: Optional[str] = None
    classification_confidence: float
    ownership_status: str
    owner_masked_reference: str = "REDACTED_PUBLIC_VIEW"  # Shows "OWN-HR-***"
    verification_status: VerificationStatus
    match_status: MatchStatus
    created_at: datetime
    updated_at: datetime


class SurveyorParcelDTO(BaseModel):
    """
    Surveyor View DTO: Full technical measurements, change detection linkages,
    and verified ownership references without raw sensitive contacts.
    """
    id: int
    parcel_id: str
    survey_id: Optional[int] = None
    survey_number: str
    subdivision_number: Optional[str] = None
    village: str
    tehsil: str
    district: str
    state: str
    land_record_source: str
    official_area_m2: float
    official_area_hectares: float
    drone_measured_area_m2: Optional[float] = None
    verified_area_m2: Optional[float] = None
    historical_area_m2: Optional[float] = None
    cadastral_geometry: Dict[str, Any]
    current_geometry: Optional[Dict[str, Any]] = None
    verified_geometry: Optional[Dict[str, Any]] = None
    geometry_source: str
    land_status: LandStatus
    land_use: str
    ai_detected_land_use: Optional[str] = None
    classification_confidence: float
    ownership_status: str
    primary_owner_name: Optional[str] = None
    owner_reference: Optional[str] = None
    owners_count: int = 1
    record_status: RecordStatus
    verification_status: VerificationStatus
    match_status: MatchStatus
    match_confidence: float
    area_difference_m2: Optional[float] = None
    area_difference_percentage: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AdminParcelDTO(SurveyorParcelDTO):
    """
    Admin View DTO: Full unrestricted access including complete ownership lineage.
    """
    owners: List[Dict[str, Any]] = []
    documents_count: int = 0
    change_records_count: int = 0


class ParcelVerificationRequest(BaseModel):
    verified_geometry: Optional[Dict[str, Any]] = None
    surveyor_comment: str = Field(..., min_length=3)
    status: VerificationStatus = VerificationStatus.SURVEYOR_VERIFIED
    verified_area_m2: Optional[float] = None


class SpatialQueryRequest(BaseModel):
    bbox: Optional[List[float]] = None  # [min_lon, min_lat, max_lon, max_lat]
    center_lon: Optional[float] = None
    center_lat: Optional[float] = None
    radius_meters: Optional[float] = None
    village: Optional[str] = None
    survey_number: Optional[str] = None
    land_use: Optional[str] = None
    verification_status: Optional[str] = None
    limit: int = 100
