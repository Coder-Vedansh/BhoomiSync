from fastapi import APIRouter, Depends
from app.modules.gis.service import GISService
from app.schemas.gis import (
    GISStatusResponse,
    SpatialMeasurementRequest,
    SpatialMeasurementResponse
)
from app.core.response import ApiResponse, success_response

router = APIRouter(prefix="/gis", tags=["GIS Engine"])


def get_service() -> GISService:
    return GISService()


@router.get("/status", response_model=ApiResponse[GISStatusResponse])
def get_gis_status(service: GISService = Depends(get_service)):
    """
    Returns GIS engine status, supported Coordinate Reference Systems, and spatial calculation metrics.
    """
    status = service.get_gis_status()
    return success_response(data=status)


@router.post("/measure", response_model=ApiResponse[SpatialMeasurementResponse])
def calculate_spatial_measurements(
    request: SpatialMeasurementRequest,
    service: GISService = Depends(get_service)
):
    """
    Calculates exact geodesic area, perimeter, centroid, and bounding box from GeoJSON geometry.
    Physical dimensions are completely invariant of map zoom level.
    """
    result = service.calculate_measurements(request.geometry)
    return success_response(data=result)
