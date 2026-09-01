from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.parcels.service import ParcelService
from app.schemas.parcel import (
    ParcelDetail,
    ParcelUpdateGeometry,
    ParcelUpdateStatus,
    ParcelAuditLogSchema
)
from app.core.response import ApiResponse, success_response

router = APIRouter(prefix="/parcels", tags=["Parcels"])


def get_service(db: Session = Depends(get_db)) -> ParcelService:
    return ParcelService(db)


@router.get("/{parcel_id}", response_model=ApiResponse[ParcelDetail])
def get_parcel(
    parcel_id: str,
    service: ParcelService = Depends(get_service)
):
    """
    Returns parcel geometry, calculated geodesic area/perimeter, land use, and status.
    """
    parcel = service.get_parcel_by_code(parcel_id)
    return success_response(data=parcel)


@router.get("/{parcel_id}/history", response_model=ApiResponse[List[ParcelAuditLogSchema]])
def get_parcel_history(
    parcel_id: str,
    service: ParcelService = Depends(get_service)
):
    """
    Returns the version history and boundary audit trail for a parcel.
    """
    history = service.get_parcel_history(parcel_id)
    return success_response(data=history)


@router.put("/{parcel_id}/geometry", response_model=ApiResponse[ParcelDetail])
def update_parcel_boundary(
    parcel_id: str,
    payload: ParcelUpdateGeometry,
    service: ParcelService = Depends(get_service)
):
    """
    Updates the geometry of a parcel following surveyor manual edits.
    Recomputes geodesic area, increments version, and records an audit log.
    """
    updated = service.update_parcel_geometry(parcel_id, payload)
    return success_response(data=updated)


@router.put("/{parcel_id}/status", response_model=ApiResponse[ParcelDetail])
def update_parcel_status(
    parcel_id: str,
    payload: ParcelUpdateStatus,
    service: ParcelService = Depends(get_service)
):
    """
    Updates verification status (AI_DETECTED -> MANUALLY_EDITED -> VERIFIED).
    """
    updated = service.update_verification_status(parcel_id, payload)
    return success_response(data=updated)
