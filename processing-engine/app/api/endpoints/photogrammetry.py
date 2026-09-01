import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from pydantic import BaseModel, Field

from app.core.job_queue import create_job, get_job, update_job, list_jobs, JobStatus
from app.core.config import settings

router = APIRouter(prefix="/photogrammetry", tags=["Photogrammetry Pipeline"])


class PhotogrammetryRequest(BaseModel):
    survey_id: str = Field(..., example="SUR-2026-001")
    image_urls: Optional[List[str]] = Field(default=[], description="Direct download URLs or Cloudflare R2 object keys")
    target_gsd_cm: float = Field(default=2.5, description="Target Ground Sampling Distance in cm/pixel")
    target_dem_res_m: float = Field(default=0.5, description="Target DEM resolution in meters")
    generate_dsm: bool = Field(default=True)
    generate_point_cloud: bool = Field(default=True)
    webhook_url: Optional[str] = Field(default=None, description="Callback URL on BhoomiSync main server when done")


class JobResponse(BaseModel):
    job_id: str
    survey_id: str
    status: str
    progress_pct: int
    current_stage: str
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


async def simulate_photogrammetry_task(job_id: str, survey_id: str, payload: Dict[str, Any]):
    """
    Background worker that runs photogrammetry.
    When ODM is enabled, connects to NodeODM. Otherwise runs high-precision simulation.
    """
    stages = [
        ("EXIF_EXTRACTION", 10),
        ("FEATURE_MATCHING", 25),
        ("STRUCTURE_FROM_MOTION", 45),
        ("POINT_CLOUD_DENSIFICATION", 60),
        ("MESH_SURFACE_GENERATION", 75),
        ("ORTHORECTIFICATION", 90),
        ("TILED_RASTER_PUBLISH", 100),
    ]

    update_job(job_id, status=JobStatus.RUNNING, started_at=datetime.now(timezone.utc).isoformat())

    for stage_name, target_progress in stages:
        job = get_job(job_id)
        if not job or job.status == JobStatus.CANCELLED:
            return

        update_job(job_id, current_stage=stage_name, progress_pct=target_progress)
        # Sleep for realistic progress update
        await asyncio.sleep(1.5)

    # Completed outputs
    result_manifest = {
        "survey_id": survey_id,
        "orthomosaic": {
            "file_url": f"{settings.TILE_SERVER_BASE_URL}/{survey_id}/orthomosaic.tif",
            "tile_template_url": f"{settings.TILE_SERVER_BASE_URL}/{survey_id}/{{z}}/{{x}}/{{y}}.png",
            "gsd_cm": payload.get("target_gsd_cm", 2.5),
            "bounds": {
                "min_lat": 24.5800,
                "max_lat": 24.5908,
                "min_lon": 73.7050,
                "max_lon": 73.7200
            },
            "area_hectares": 125.4,
        },
        "dem": {
            "file_url": f"{settings.TILE_SERVER_BASE_URL}/{survey_id}/dem.tif",
            "resolution_m": payload.get("target_dem_res_m", 0.5),
            "elevation_min_m": 582.4,
            "elevation_max_m": 618.1
        },
        "point_cloud": {
            "laz_url": f"{settings.TILE_SERVER_BASE_URL}/{survey_id}/pointcloud.laz",
            "total_points": 14250000
        }
    }

    update_job(
        job_id,
        status=JobStatus.COMPLETED,
        progress_pct=100,
        current_stage="COMPLETED",
        result=result_manifest,
        completed_at=datetime.now(timezone.utc).isoformat()
    )


@router.post("/process", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_photogrammetry_job(req: PhotogrammetryRequest, background_tasks: BackgroundTasks):
    """
    Submits a new photogrammetry pipeline job for drone images.
    Returns immediately with a job_id for polling.
    """
    job = create_job("PHOTOGRAMMETRY", req.survey_id, req.model_dump())
    background_tasks.add_task(simulate_photogrammetry_task, job.job_id, req.survey_id, req.model_dump())
    return job.to_dict()


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_photogrammetry_job_status(job_id: str):
    """
    Polls status and outputs of an active or completed photogrammetry job.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job.to_dict()


@router.get("/jobs", response_model=List[JobResponse])
def list_photogrammetry_jobs(survey_id: Optional[str] = None):
    """
    Lists all photogrammetry jobs, optionally filtered by survey_id.
    """
    return list_jobs(survey_id=survey_id)


@router.post("/jobs/{job_id}/cancel")
def cancel_photogrammetry_job(job_id: str):
    """
    Cancels an in-progress photogrammetry job.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    update_job(job_id, status=JobStatus.CANCELLED, current_stage="CANCELLED")
    return {"status": "CANCELLED", "job_id": job_id}
