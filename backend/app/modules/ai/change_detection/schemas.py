from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class ChangeDetectionRequest(BaseModel):
    survey_id: str
    historical_dataset_id: Optional[str] = None
    current_dataset_id: Optional[str] = None
    model_id: Optional[str] = "change-detector-v1"
    confidence_threshold: Optional[float] = 0.60


class ChangeItem(BaseModel):
    change_id: str
    change_type: str
    severity: str
    old_value: str
    new_value: str
    area_affected_m2: float
    percentage_change: float
    confidence: float
    geometry: Dict[str, Any]
    crs: str = "EPSG:4326"
    historical_dataset_id: Optional[str] = None
    current_dataset_id: Optional[str] = None
    audit_status: str
    model_version: str


class ChangeDetectionResponse(BaseModel):
    inference_id: str
    survey_id: str
    model_id: str
    model_version: str
    execution_time_ms: float
    total_changes: int
    potential_encroachments_count: int
    changes: List[ChangeItem]
    is_demo_simulation: bool = True


class CompareDatasetsRequest(BaseModel):
    survey_id: str
    historical_dataset_id: str
    current_dataset_id: str


class CompareParcelsRequest(BaseModel):
    survey_id: str
    parcel_ids: Optional[List[str]] = None
