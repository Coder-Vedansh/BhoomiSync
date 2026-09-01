from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.core.job_queue import list_jobs

router = APIRouter(tags=["Health & Status"])

@router.get("/health")
def engine_health():
    """
    Returns engine service health, photogrammetry backend status, and active job load.
    """
    all_jobs = list_jobs()
    running_jobs = [j for j in all_jobs if j["status"] == "RUNNING"]
    queued_jobs = [j for j in all_jobs if j["status"] == "QUEUED"]

    return {
        "status": "HEALTHY",
        "service": "BhoomiSync Photogrammetry & AI Processing Engine",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "capabilities": {
            "photogrammetry": "OpenDroneMap (ODM)" if settings.ODM_ENABLED else "Simulation Mode (ODM Inactive)",
            "odm_endpoint": settings.ODM_URL if settings.ODM_ENABLED else None,
            "tile_server": settings.TILE_SERVER_BASE_URL,
            "ai_models": ["Agricultural-Bund-Detection-v2", "LULC-DeepLabV3-Cadastral", "Siamese-Encroachment-Detector"],
        },
        "queue": {
            "active_running": len(running_jobs),
            "pending_queued": len(queued_jobs),
            "total_processed": len(all_jobs)
        }
    }
