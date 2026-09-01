from typing import Optional
from pydantic import BaseModel, Field


class ParcelBoundaryJobRequest(BaseModel):
    survey_id: str
    dataset_id: str
    min_parcel_area_m2: float = Field(default=100.0, ge=10.0)
    simplification_tolerance_m: float = Field(default=0.2, ge=0.01, le=5.0)


class ParcelBoundaryJobResponse(BaseModel):
    job_id: str
    survey_id: str
    dataset_id: str
    model_name: str
    status: str
    parcels_detected_count: int
    average_confidence: float
    output_dataset_id: str
