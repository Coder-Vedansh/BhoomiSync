from typing import Dict, Any, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.response import StandardResponse
from app.modules.ai.classification.schemas import ClassificationPredictRequest
from app.modules.ai.classification.service import ClassificationService
from app.models.ingestion import ProcessingJob
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/classification", tags=["AI Land Classification"])


@router.post("/predict")
def predict_land_classification(
    payload: ClassificationPredictRequest,
    db: Session = Depends(get_db),
):
    """
    Executes land classification AI on survey orthomosaics and DEM elevation grids.
    """
    service = ClassificationService(db)
    result = service.run_classification_pipeline(
        survey_id=payload.survey_id,
        dataset_id=payload.dataset_id,
        confidence_threshold=payload.confidence_threshold or 0.50,
    )
    return StandardResponse.success_response(data=result, message="AI land classification executed successfully")


@router.post("/batch")
def batch_land_classification(
    payloads: List[ClassificationPredictRequest],
    db: Session = Depends(get_db),
):
    """
    Batch processes multiple survey datasets for land classification.
    """
    service = ClassificationService(db)
    results = [
        service.run_classification_pipeline(
            survey_id=p.survey_id,
            dataset_id=p.dataset_id,
            confidence_threshold=p.confidence_threshold or 0.50,
        )
        for p in payloads
    ]
    return StandardResponse.success_response(data={"total_processed": len(results), "batch_results": results})


@router.get("/{job_id}")
def get_classification_job(
    job_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieves the status and result payload of an AI classification job.
    """
    job = db.query(ProcessingJob).filter(ProcessingJob.job_id == job_id).first()
    if not job:
        raise NotFoundException(f"Job {job_id} not found")

    return StandardResponse.success_response(
        data={
            "job_id": job.job_id,
            "job_type": job.job_type.value if hasattr(job.job_type, "value") else str(job.job_type),
            "status": job.status.value if hasattr(job.status, "value") else str(job.status),
            "progress_percentage": job.progress_percentage,
            "parameters": job.parameters_json,
            "result": job.result_json,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }
    )


@router.get("/survey/{survey_id}")
def get_survey_classifications(
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns all classified land-use polygon regions for a survey.
    """
    service = ClassificationService(db)
    regions = service.get_survey_classifications(survey_id)
    return StandardResponse.success_response(data=regions)
