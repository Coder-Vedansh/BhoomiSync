from fastapi import APIRouter, Depends
from app.modules.ai.parcel_boundary.service import ParcelBoundaryService
from app.modules.ai.parcel_boundary.schemas import (
    ParcelBoundaryJobRequest,
    ParcelBoundaryJobResponse
)
from app.core.response import ApiResponse, success_response

router = APIRouter(prefix="/parcel-boundary", tags=["AI - Parcel Boundary"])


def get_service() -> ParcelBoundaryService:
    return ParcelBoundaryService()


@router.get("/info", response_model=ApiResponse[dict])
def get_model_info(service: ParcelBoundaryService = Depends(get_service)):
    info = service.get_info()
    return success_response(data=info)


@router.post("/run", response_model=ApiResponse[ParcelBoundaryJobResponse])
def execute_boundary_detection(
    request: ParcelBoundaryJobRequest,
    service: ParcelBoundaryService = Depends(get_service)
):
    result = service.run_detection(request)
    return success_response(data=result)
