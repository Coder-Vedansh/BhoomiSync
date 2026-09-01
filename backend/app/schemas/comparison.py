from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ComparisonStatusResponse(BaseModel):
    status: str
    engine_version: str
    supported_metrics: List[str]
    max_comparison_parcels: int
    capabilities: List[str]


class ParcelComparisonDetail(BaseModel):
    parcel_id: str
    historical_area_m2: float
    current_area_m2: float
    area_difference_m2: float
    area_change_percentage: float
    iou_overlap: float
    historical_land_use: str
    current_land_use: str
    land_use_changed: bool
    status: str  # MATCHED, ENCROACHMENT_FLAGGED, SUBDIVIDED, RESHAPED


class SurveyComparisonReport(BaseModel):
    survey_id: str
    historical_survey_ref: str
    total_parcels_compared: int
    encroachment_alerts_count: int
    average_area_drift_percentage: float
    comparisons: List[ParcelComparisonDetail]
