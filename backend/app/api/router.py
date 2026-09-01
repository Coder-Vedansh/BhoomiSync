from datetime import datetime
from fastapi import APIRouter
from app.modules.surveys.router import router as surveys_router
from app.modules.datasets.router import router as datasets_router
from app.modules.parcels.router import router as parcels_router
from app.modules.ai.router import router as ai_router
from app.modules.gis.router import router as gis_router
from app.modules.comparison.router import router as comparison_router
from app.modules.cloud_ingestion.ingestion_router import router as ingestion_router
from app.modules.geospatial_processing.routers.geospatial_router import router as geospatial_router
from app.modules.land_records.routers.land_records_router import router as land_records_router
from app.modules.auth.auth_router import router as auth_router
from app.modules.reporting.routers.report_router import router as report_router
from app.modules.drone_ingestion.routers.drone_ingestion_router import router as drone_router
from app.modules.system.system_health_router import router as system_router
from app.schemas.common import SystemHealthStatus
from app.core.config import settings
from app.core.response import ApiResponse, success_response

# Primary canonical v1 router
api_v1_router = APIRouter(prefix="/api/v1")

@api_v1_router.get("/health", response_model=ApiResponse[SystemHealthStatus], tags=["System Health"])
def health_check():
    """
    Returns platform health, active database engine, storage provider, and sensor gateway mode.
    """
    status = SystemHealthStatus(
        status="HEALTHY",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        database="PostgreSQL+PostGIS (Ready)" if "postgres" in settings.DATABASE_URL else "SQLite Spatial (Dev Mode)",
        storage_provider=settings.STORAGE_PROVIDER,
        gateway_type=settings.DATA_GATEWAY_TYPE,
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
    return success_response(data=status)


# Mount all domain sub-routers under /api/v1
api_v1_router.include_router(system_router)
api_v1_router.include_router(drone_router, prefix="/drone")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(report_router)
api_v1_router.include_router(surveys_router)
api_v1_router.include_router(datasets_router)
api_v1_router.include_router(land_records_router)
api_v1_router.include_router(parcels_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(gis_router)
api_v1_router.include_router(comparison_router)
api_v1_router.include_router(ingestion_router)
api_v1_router.include_router(geospatial_router)

# Compatibility router under /api
api_compat_router = APIRouter(prefix="/api")
api_compat_router.get("/health", response_model=ApiResponse[SystemHealthStatus], tags=["System Health"])(health_check)
api_compat_router.include_router(system_router)
api_compat_router.include_router(drone_router, prefix="/drone")
api_compat_router.include_router(auth_router)
api_compat_router.include_router(report_router)
api_compat_router.include_router(surveys_router)
api_compat_router.include_router(datasets_router)
api_compat_router.include_router(land_records_router)
api_compat_router.include_router(parcels_router)
api_compat_router.include_router(ai_router)
api_compat_router.include_router(gis_router)
api_compat_router.include_router(comparison_router)
api_compat_router.include_router(ingestion_router)
api_compat_router.include_router(geospatial_router)





