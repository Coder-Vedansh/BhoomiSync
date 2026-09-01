from fastapi import APIRouter, Depends
from app.modules.ai.land_classification.service import LandClassificationService
from app.modules.ai.land_classification.schemas import (
    LandClassificationJobRequest,
    LandClassificationJobResponse
)
from app.core.response import ApiResponse, success_response

router = APIRouter(prefix="/land-classification", tags=["AI - Land Classification"])


def get_service() -> LandClassificationService:
    return LandClassificationService()


@router.get("/info", response_model=ApiResponse[dict])
def get_model_info(service: LandClassificationService = Depends(get_service)):
    info = service.get_info()
    return success_response(data=info)


@router.post("/run", response_model=ApiResponse[LandClassificationJobResponse])
def execute_classification(
    request: LandClassificationJobRequest,
    service: LandClassificationService = Depends(get_service)
):
    result = service.run_classification(request)
    return success_response(data=result)
