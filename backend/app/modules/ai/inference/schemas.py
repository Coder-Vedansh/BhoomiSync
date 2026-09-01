from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class RunAllInferenceRequest(BaseModel):
    survey_id: str
    confidence_threshold: Optional[float] = 0.60


class AIModelRegisterRequest(BaseModel):
    model_id: str
    model_name: str
    model_type: str
    version: str
    framework: Optional[str] = "PyTorch / ONNX / Ultralytics"
    classes: List[str]
    input_requirements: Optional[List[str]] = None
    sensor_requirements: Optional[List[str]] = None
    model_path: Optional[str] = None


class SurveyAISummaryResponse(BaseModel):
    survey_id: str
    total_classifications: int
    total_candidate_boundaries: int
    total_changes_detected: int
    potential_encroachments: int
    active_models_count: int
    overall_health: str = "OPERATIONAL"
