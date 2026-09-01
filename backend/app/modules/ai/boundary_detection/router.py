from typing import Dict, Any, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.response import StandardResponse
from app.modules.ai.boundary_detection.schemas import (
    BoundaryDetectRequest,
    BoundaryVerifyRequest,
    BoundaryRejectRequest,
    BoundaryEditRequest,
)
from app.modules.ai.boundary_detection.service import BoundaryService
from app.models.ingestion import ProcessingJob
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/boundary", tags=["AI Boundary Intelligence"])


@router.post("/detect")
def detect_candidate_boundaries(
    payload: BoundaryDetectRequest,
    db: Session = Depends(get_db),
):
    """
    Runs multi-sensor boundary intelligence fusing LiDAR ridges + RGB orthomosaics + DEM slopes.
    """
    service = BoundaryService(db)
    result = service.run_boundary_detection_pipeline(
        survey_id=payload.survey_id,
        dataset_id=payload.dataset_id,
        confidence_threshold=payload.confidence_threshold or 0.60,
    )
    return StandardResponse.success_response(data=result, message="Candidate boundary detection completed")


@router.get("/{job_id}")
def get_boundary_job(
    job_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieves the status and result payload of an AI boundary detection job.
    """
    job = db.query(ProcessingJob).filter(ProcessingJob.job_id == job_id).first()
    if not job:
        raise NotFoundException(f"Job {job_id} not found")

    return StandardResponse.success_response(
        data={
            "job_id": job.job_id,
            "status": job.status.value if hasattr(job.status, "value") else str(job.status),
            "progress_percentage": job.progress_percentage,
            "parameters": job.parameters_json,
            "result": job.result_json,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }
    )


@router.get("/survey/{survey_id}")
def get_survey_boundaries(
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns all AI candidate boundaries for a survey with verification statuses.
    """
    service = BoundaryService(db)
    boundaries = service.get_survey_boundaries(survey_id)
    return StandardResponse.success_response(data=boundaries)


@router.post("/{boundary_id}/verify")
def verify_boundary(
    boundary_id: str,
    payload: BoundaryVerifyRequest,
    db: Session = Depends(get_db),
):
    """
    Authorizes surveyor verification of an AI candidate boundary.
    """
    service = BoundaryService(db)
    result = service.verify_candidate_boundary(
        boundary_id=boundary_id,
        comment=payload.comment or "Surveyor verified",
        khasra_no=payload.khasra_no,
        land_use=payload.land_use or "AGRICULTURAL_CROP",
    )
    return StandardResponse.success_response(data=result, message="Boundary verified")


@router.post("/{boundary_id}/reject")
def reject_boundary(
    boundary_id: str,
    payload: BoundaryRejectRequest,
    db: Session = Depends(get_db),
):
    """
    Rejects a false positive or temporary crop boundary candidate.
    """
    service = BoundaryService(db)
    result = service.reject_candidate_boundary(
        boundary_id=boundary_id,
        reason=payload.reason,
    )
    return StandardResponse.success_response(data=result, message="Boundary rejected")


@router.post("/{boundary_id}/edit")
def edit_boundary_vertices(
    boundary_id: str,
    payload: BoundaryEditRequest,
    db: Session = Depends(get_db),
):
    """
    Saves surveyor vertex adjustments with audit log lineage.
    """
    service = BoundaryService(db)
    result = service.edit_candidate_boundary(
        boundary_id=boundary_id,
        geometry_geojson=payload.geometry_geojson,
        comment=payload.comment or "Surveyor adjusted vertices",
    )
    return StandardResponse.success_response(data=result, message="Boundary vertices updated")
