from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AIModuleInfo(BaseModel):
    module_id: str
    name: str
    version: str
    category: str
    status: str
    description: str
    supported_inputs: List[str]
    output_type: str


class AIModulesResponse(BaseModel):
    total_modules: int
    modules: List[AIModuleInfo]


class LandClassificationRequest(BaseModel):
    dataset_id: str
    classes: List[str] = Field(default_factory=lambda: ["CROP", "FALLOW", "WATER", "TREES", "BUILT_UP"])
    confidence_threshold: float = 0.65


class ParcelBoundaryDetectionRequest(BaseModel):
    dataset_id: str
    detection_method: str = "MULTISPECTRAL_EDGE_CONTOUR"
    smoothing_tolerance: float = 0.5


class ChangeDetectionRequest(BaseModel):
    historical_dataset_id: str
    current_dataset_id: str
    detection_metrics: List[str] = Field(default_factory=lambda: ["BOUNDARY_DRIFT", "AREA_DISCREPANCY", "LAND_USE_TRANSITION"])
