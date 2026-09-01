from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.surveys.service import SurveyService
from app.schemas.survey import SurveyCreate, SurveySummary, SurveyDetail
from app.schemas.dataset import DatasetSummary, SurveyLineageGraph
from app.schemas.parcel import ParcelDetail
from app.core.response import ApiResponse, success_response

router = APIRouter(prefix="/surveys", tags=["Surveys"])


def get_service(db: Session = Depends(get_db)) -> SurveyService:
    return SurveyService(db)


@router.get("", response_model=ApiResponse[List[SurveySummary]])
def list_surveys(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    service: SurveyService = Depends(get_service)
):
    """
    Returns list of all agricultural surveys and resurvey missions.
    """
    skip = (page - 1) * page_size
    surveys, total = service.list_surveys(skip=skip, limit=page_size)
    return success_response(
        data=surveys,
        meta={"page": page, "page_size": page_size, "total_count": total}
    )


@router.post("", response_model=ApiResponse[SurveyDetail])
def create_survey(
    payload: SurveyCreate,
    service: SurveyService = Depends(get_service)
):
    """
    Creates a new survey mission.
    """
    survey = service.create_survey(payload)
    return success_response(data=survey)


@router.get("/{survey_id}", response_model=ApiResponse[SurveyDetail])
def get_survey(
    survey_id: str,
    service: SurveyService = Depends(get_service)
):
    """
    Retrieves survey details by unique survey identifier (e.g. SUR-2026-001).
    """
    survey = service.get_survey_by_code(survey_id)
    return success_response(data=survey)


@router.get("/{survey_id}/datasets", response_model=ApiResponse[List[DatasetSummary]])
def get_survey_datasets(
    survey_id: str,
    service: SurveyService = Depends(get_service)
):
    """
    Returns all raw and processed datasets belonging to a survey.
    """
    datasets = service.get_survey_datasets(survey_id)
    return success_response(data=datasets)


@router.get("/{survey_id}/parcels", response_model=ApiResponse[List[ParcelDetail]])
def get_survey_parcels(
    survey_id: str,
    service: SurveyService = Depends(get_service)
):
    """
    Returns all parcel boundaries with calculated geospatial metrics for a survey.
    """
    parcels = service.get_survey_parcels(survey_id)
    return success_response(data=parcels)


@router.get("/{survey_id}/lineage", response_model=ApiResponse[SurveyLineageGraph])
def get_survey_lineage(
    survey_id: str,
    service: SurveyService = Depends(get_service)
):
    """
    Returns the complete provenance graph (DAG) showing how raw datasets derived processed rasters & AI parcels.
    """
    lineage = service.get_survey_lineage(survey_id)
    return success_response(data=lineage)


@router.get("/{survey_id}/lifecycle")
def get_survey_lifecycle(
    survey_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns the 10-stage unified lifecycle status for a survey.
    """
    from app.modules.surveys.services.survey_lifecycle_service import SurveyLifecycleService
    lifecycle_service = SurveyLifecycleService(db)
    status = lifecycle_service.get_survey_lifecycle(survey_id)
    return success_response(data=status)


@router.post("/{survey_id}/lifecycle/transition")
async def transition_survey_lifecycle(
    survey_id: str,
    target_stage: str = Query(..., description="Target lifecycle stage e.g. MISSION_ACTIVE, PROCESSING, APPROVED"),
    actor_role: str = Query("SURVEYOR", description="Role initiating transition"),
    comment: str = Query(None, description="Optional transition notes"),
    db: Session = Depends(get_db)
):
    """
    Transitions survey to a target lifecycle stage and broadcasts WebSocket updates.
    """
    from app.modules.surveys.services.survey_lifecycle_service import SurveyLifecycleService, SurveyLifecycleStage
    lifecycle_service = SurveyLifecycleService(db)
    stage_enum = SurveyLifecycleStage(target_stage)
    status = await lifecycle_service.transition_stage(survey_id, stage_enum, actor_role=actor_role, comment=comment)
    return success_response(data=status)

