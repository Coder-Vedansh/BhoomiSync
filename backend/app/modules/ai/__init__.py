from app.modules.ai.classification.router import router as classification_router
from app.modules.ai.boundary_detection.router import router as boundary_router
from app.modules.ai.land_use.router import router as land_use_router
from app.modules.ai.change_detection.router import router as change_detection_router
from app.modules.ai.inference.router import router as inference_router

__all__ = [
    "classification_router",
    "boundary_router",
    "land_use_router",
    "change_detection_router",
    "inference_router",
]
