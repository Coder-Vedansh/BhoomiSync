from fastapi import APIRouter
from app.modules.ai.classification.router import router as classification_router
from app.modules.ai.boundary_detection.router import router as boundary_router
from app.modules.ai.land_use.router import router as land_use_router
from app.modules.ai.change_detection.router import router as change_detection_router
from app.modules.ai.inference.router import router as inference_router
from app.schemas.ai import AIModulesResponse, AIModuleInfo
from app.core.response import ApiResponse, success_response

router = APIRouter(prefix="/ai", tags=["AI Modules & Intelligence"])

# Mount Prompt 4 Modular AI Routers
router.include_router(classification_router)
router.include_router(boundary_router)
router.include_router(land_use_router)
router.include_router(change_detection_router)
router.include_router(inference_router)


from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class HFTestRequest(BaseModel):
    api_key: Optional[str] = Field(None, description="Optional Hugging Face token to test")
    sam_model: Optional[str] = Field(None, description="Optional custom SAM model ID")
    lulc_model: Optional[str] = Field(None, description="Optional custom LULC model ID")

class PipelineExecuteRequest(BaseModel):
    survey_id: str = Field(..., description="Survey identifier")
    pipelines: List[str] = Field(default_factory=lambda: ["lulc", "bund", "change"])
    confidence_threshold: float = Field(0.60, ge=0.1, le=1.0)
    edge_sensitivity: float = Field(0.75, ge=0.1, le=1.0)
    simplify_tolerance_m: float = Field(0.12, ge=0.01, le=2.0)

@router.get("/huggingface/status")
async def get_huggingface_status(api_key: Optional[str] = None):
    """
    Returns live connection and configuration status of the Hugging Face Serverless Inference API.
    Optionally validates a provided api_key query param.
    """
    from app.modules.ai.services.huggingface_service import hf_inference_service
    status_info = await hf_inference_service.check_api_status(test_key=api_key)
    return success_response(data=status_info)

@router.post("/huggingface/test")
async def test_huggingface_connection(payload: HFTestRequest):
    """
    Explicitly tests a Hugging Face API key token against whoami-v2.
    """
    from app.modules.ai.services.huggingface_service import hf_inference_service
    status_info = await hf_inference_service.check_api_status(test_key=payload.api_key)
    return success_response(data=status_info, message="Hugging Face API connection test completed")



@router.get("/modules", response_model=ApiResponse[AIModulesResponse])
def list_ai_modules():
    """
    Returns registered AI submodules, versions, architecture metadata, and supported inputs.
    """
    modules = [
        AIModuleInfo(
            module_id="AI-MOD-01",
            name="Agricultural Land Classification",
            version="1.2.0",
            category="Semantic Segmentation",
            status="READY",
            description="Model-agnostic multispectral crop, fallow, water, building, and vegetation classification.",
            supported_inputs=["RGB_ORTHOMOSAIC", "DEM_RASTER", "NDVI_BAND"],
            output_type="RASTER_MASK_GEOJSON",
        ),
        AIModuleInfo(
            module_id="AI-MOD-02",
            name="Cadastral Parcel Boundary Detection",
            version="2.0.1",
            category="Geospatial Edge & Boundary Segmentation",
            status="READY",
            description="Multi-sensor segmentation of field bunds, hedgerows, and farm boundaries.",
            supported_inputs=["ORTHOMOSAIC_HIGH_RES", "LIDAR_POINT_CLOUD", "DEM_HILLSHADE"],
            output_type="GEOJSON_POLYGONS",
        ),
        AIModuleInfo(
            module_id="AI-MOD-03",
            name="Temporal Geospatial Change Detection",
            version="1.5.0",
            category="Vector & Raster Diff Analysis",
            status="READY",
            description="Comparison of historical revenue land records vs current drone survey geometry.",
            supported_inputs=["HISTORICAL_SURVEY_DATASET", "CURRENT_DRONE_DATASET"],
            output_type="ENCROACHMENT_DIFF_REPORT",
        ),
        AIModuleInfo(
            module_id="AI-MOD-04",
            name="Multi-Modal Sensor Fusion Inference",
            version="1.0.0",
            category="Multi-Sensor Fusion",
            status="READY",
            description="Synchronous inference fusing RGB imagery, LiDAR CSF, and DEM slope gradient vectors.",
            supported_inputs=["RGB_CAMERA", "LIDAR_LAS", "DEM_RASTER", "RTK_TRACK"],
            output_type="INTEGRATED_CADASTRAL_REPORT",
        ),
    ]
    return success_response(
        data=AIModulesResponse(total_modules=len(modules), modules=modules)
    )
