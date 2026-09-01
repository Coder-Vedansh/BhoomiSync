from fastapi import APIRouter
from app.api.endpoints.health import router as health_router
from app.api.endpoints.photogrammetry import router as photogrammetry_router
from app.api.endpoints.ai_inference import router as ai_router
from app.api.endpoints.tiles import router as tiles_router

engine_router = APIRouter()

engine_router.include_router(health_router)
engine_router.include_router(photogrammetry_router)
engine_router.include_router(ai_router)
engine_router.include_router(tiles_router)
