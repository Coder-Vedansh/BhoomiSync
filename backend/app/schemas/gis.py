from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class GISStatusResponse(BaseModel):
    status: str
    spatial_engine: str
    default_crs: str
    supported_crs: List[str]
    geodesic_calculator: str
    capabilities: List[str]


class SpatialMeasurementRequest(BaseModel):
    geometry: Dict[str, Any]
    crs: str = "EPSG:4326"


class SpatialMeasurementResponse(BaseModel):
    area_m2: float
    area_hectares: float
    area_acres: float
    perimeter_m: float
    centroid: Dict[str, float]
    bounding_box: List[float]


class PhotogrammetryJobStatus(BaseModel):
    job_id: str
    survey_id: str
    status: str
    progress_percentage: float
    step_description: str
