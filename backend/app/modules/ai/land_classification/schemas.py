from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class LandClassificationJobRequest(BaseModel):
    survey_id: str
    dataset_id: str
    target_classes: Optional[List[str]] = None
    confidence_threshold: float = Field(default=0.70, ge=0.0, le=1.0)


class LandClassificationJobResponse(BaseModel):
    job_id: str
    survey_id: str
    dataset_id: str
    model_name: str
    status: str
    class_distribution: Dict[str, float]
    output_dataset_id: str
