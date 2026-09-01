from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class BoundaryDetectRequest(BaseModel):
    survey_id: str
    dataset_id: Optional[str] = None
    model_id: Optional[str] = "boundary-segmentation-v2"
    confidence_threshold: Optional[float] = 0.60
    boundary_types_filter: Optional[List[str]] = None


class BoundaryCandidateItem(BaseModel):
    boundary_id: str
    boundary_type: str
    confidence: float
    sources: List[str]
    geometry: Dict[str, Any]
    crs: str = "EPSG:4326"
    length_m: float
    estimated_area_m2: float
    verification_status: str
    model_version: str


class BoundaryDetectResponse(BaseModel):
    inference_id: str
    survey_id: str
    model_id: str
    model_version: str
    execution_time_ms: float
    total_candidates: int
    candidates: List[BoundaryCandidateItem]
    is_demo_simulation: bool = True


class BoundaryVerifyRequest(BaseModel):
    comment: Optional[str] = "Surveyor verified candidate boundary as authoritative"
    khasra_no: Optional[str] = None
    land_use: Optional[str] = "AGRICULTURAL_CROP"


class BoundaryRejectRequest(BaseModel):
    reason: str = "False positive or seasonal temporary crop texture"


class BoundaryEditRequest(BaseModel):
    geometry_geojson: Dict[str, Any]
    comment: Optional[str] = "Surveyor adjusted boundary vertices"
