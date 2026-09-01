from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class AgriculturalDetectRequest(BaseModel):
    survey_id: str
    dataset_id: Optional[str] = None
    model_id: Optional[str] = "agri-detector-v1"
    confidence_threshold: Optional[float] = 0.60


class AgriculturalPlotItem(BaseModel):
    parcel_id: str
    crop_type: str
    vegetation_vigor_ndvi: float
    confidence: float
    area_m2: float
    area_hectares: float
    geometry: Dict[str, Any]
    crs: str = "EPSG:4326"
    model_version: str


class AgriculturalDetectResponse(BaseModel):
    survey_id: str
    model_id: str
    model_version: str
    total_plots: int
    plots: List[AgriculturalPlotItem]
    is_demo_simulation: bool = True
