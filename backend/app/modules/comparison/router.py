from fastapi import APIRouter, Depends
from app.modules.comparison.service import ComparisonService
from app.schemas.comparison import (
    ComparisonStatusResponse,
    SurveyComparisonReport
)
from app.core.response import ApiResponse, success_response

router = APIRouter(prefix="/comparison", tags=["Historical Comparison"])


def get_service() -> ComparisonService:
    return ComparisonService()


@router.get("/status", response_model=ApiResponse[ComparisonStatusResponse])
def get_comparison_status(service: ComparisonService = Depends(get_service)):
    """
    Returns Historical vs Current Comparison Engine status, metrics, and capabilities.
    """
    status = service.get_comparison_status()
    return success_response(data=status)


@router.get("/surveys/{survey_id}", response_model=ApiResponse[SurveyComparisonReport])
def get_survey_comparison(
    survey_id: str,
    service: ComparisonService = Depends(get_service)
):
    """
    Returns detailed comparison report of historical land cadastre vs newly acquired drone survey parcels.
    """
    report = service.generate_survey_comparison_report(survey_id)
    return success_response(data=report)
