from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.land_records import OwnershipType


class LandOwnerBase(BaseModel):
    owner_id: str
    owner_reference: str
    name: str
    ownership_type: OwnershipType = OwnershipType.INDIVIDUAL
    ownership_percentage: float = 100.0
    contact_reference: Optional[str] = None
    record_source: str = "Apna Khata Land Registry"


class LandOwnerCreate(LandOwnerBase):
    pass


class PublicOwnerDTO(BaseModel):
    owner_reference: str
    ownership_type: OwnershipType
    ownership_percentage: float
    record_source: str
    name_masked: str  # e.g. "R***** P****"


class SurveyorOwnerDTO(BaseModel):
    owner_id: str
    owner_reference: str
    name: str
    ownership_type: OwnershipType
    ownership_percentage: float
    record_source: str
    contact_reference_masked: Optional[str] = None
    created_at: datetime


class ParcelOwnershipDTO(BaseModel):
    id: int
    parcel_id: int
    owner_id: int
    owner: SurveyorOwnerDTO
    ownership_percentage: float
    ownership_start_date: Optional[datetime] = None
    ownership_status: str
