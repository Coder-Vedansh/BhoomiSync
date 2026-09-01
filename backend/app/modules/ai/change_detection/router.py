from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.response import StandardResponse
from app.modules.ai.change_detection.schemas import (
    ChangeDetectionRequest,
    CompareDatasetsRequest,
    CompareParcelsRequest,
)
from app.modules.ai.change_detection.service import ChangeDetectionService
from app.models.ingestion import ProcessingJob
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/change-detection", tags=["AI Historical Change Detection"])


@router.post("")
def run_change_detection(
    payload: ChangeDetectionRequest,
    db: Session = Depends(get_db),
):
    """
    Executes historical change detection comparing old survey records against modern drone data.
    """
    service = ChangeDetectionService(db)
    result = service.run_change_detection_pipeline(
        survey_id=payload.survey_id,
        historical_dataset_id=payload.historical_dataset_id,
        current_dataset_id=payload.current_dataset_id,
        confidence_threshold=payload.confidence_threshold or 0.60,
    )
    return StandardResponse.success_response(data=result, message="Change detection executed successfully")


@router.get("/{survey_id}")
def get_survey_changes(
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieves all detected changes and potential encroachment candidates for a survey.
    """
    service = ChangeDetectionService(db)
    changes = service.get_survey_changes(survey_id)
    return StandardResponse.success_response(data=changes)


@router.post("/compare-datasets")
def compare_datasets(
    payload: CompareDatasetsRequest,
    db: Session = Depends(get_db),
):
    """
    Explicit comparison between two specific dataset IDs.
    """
    service = ChangeDetectionService(db)
    result = service.run_change_detection_pipeline(
        survey_id=payload.survey_id,
        historical_dataset_id=payload.historical_dataset_id,
        current_dataset_id=payload.current_dataset_id,
    )
    return StandardResponse.success_response(data=result)


@router.post("/compare-parcels")
def compare_parcels(
    payload: CompareParcelsRequest,
    db: Session = Depends(get_db),
):
    """
    Compares specific cadastral parcels between historical cadastre and drone resurvey.
    """
    service = ChangeDetectionService(db)
    result = service.run_change_detection_pipeline(survey_id=payload.survey_id)
    return StandardResponse.success_response(data=result)
