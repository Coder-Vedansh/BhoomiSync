from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class ClassificationPredictRequest(BaseModel):
    survey_id: str
    dataset_id: Optional[str] = None
    model_id: Optional[str] = "land-classifier-yolo-v1"
    confidence_threshold: Optional[float] = 0.50
    classes_filter: Optional[List[str]] = None


class ClassifiedRegionItem(BaseModel):
    class_name: str = Field(..., alias="class")
    confidence: float
    area_m2: float
    area_hectares: float
    percentage: float
    geometry: Dict[str, Any]
    crs: str = "EPSG:4326"
    source_dataset_id: Optional[str] = None
    model_version: str

    model_config = {"populate_by_name": True}


class ClassificationPredictResponse(BaseModel):
    inference_id: str
    survey_id: str
    status: str
    model_id: str
    model_version: str
    execution_time_ms: float
    total_regions: int
    confidence_tier: str
    summary_distribution: Dict[str, float]
    regions: List[ClassifiedRegionItem]
    is_demo_simulation: bool = True
