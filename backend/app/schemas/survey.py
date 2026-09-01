from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.survey import SurveyStatus


class SurveyBase(BaseModel):
    name: str
    location: str
    district: Optional[str] = None
    state: Optional[str] = None
    status: SurveyStatus = Field(default=SurveyStatus.PLANNED)
    survey_date: Optional[datetime] = Field(default_factory=datetime.utcnow)
    center_latitude: float = Field(default=24.5854)
    center_longitude: float = Field(default=73.7125)
    boundary_geojson: Optional[Dict[str, Any]] = None
    total_area_hectares: Optional[float] = Field(default=0.0)
    description: Optional[str] = None


class SurveyCreate(SurveyBase):
    survey_id: Optional[str] = None


class SurveyUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    status: Optional[SurveyStatus] = None
    center_latitude: Optional[float] = None
    center_longitude: Optional[float] = None
    boundary_geojson: Optional[Dict[str, Any]] = None
    total_area_hectares: Optional[float] = None
    description: Optional[str] = None


class SurveySummary(BaseModel):
    id: int
    survey_id: str
    name: str
    location: str
    district: Optional[str] = None
    state: Optional[str] = None
    status: SurveyStatus
    survey_date: datetime
    center_latitude: float
    center_longitude: float
    total_area_hectares: float
    dataset_count: int = 0
    parcel_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SurveyDetail(SurveySummary):
    boundary_geojson: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
