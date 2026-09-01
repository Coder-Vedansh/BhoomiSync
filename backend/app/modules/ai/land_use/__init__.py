from app.modules.ai.land_use.land_use_classifier import DetailedLandUseClassifier
from app.modules.ai.land_use.service import LandUseService
from app.modules.ai.land_use.router import router as land_use_router

__all__ = [
    "DetailedLandUseClassifier",
    "LandUseService",
    "land_use_router",
]
