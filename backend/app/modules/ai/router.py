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
