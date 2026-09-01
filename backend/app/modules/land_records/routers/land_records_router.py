from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.response import StandardResponse
from app.modules.land_records.services.parcel_service import ParcelService
from app.modules.land_records.services.land_record_service import LandRecordService
from app.modules.land_records.services.document_service import ParcelDocumentService
from app.modules.land_records.schemas.parcel_schemas import ParcelVerificationRequest
from app.modules.land_records.schemas.import_schemas import LandRecordImportRequest
from app.models.auth.models import User
from app.modules.auth.dependencies import get_optional_current_user, require_permission
from app.modules.auth.permissions import Permissions
from pydantic import BaseModel, Field

router = APIRouter(tags=["Land Records, Ownership & Cadastral Intelligence"])


class DocumentUploadPayload(BaseModel):
    title: str = Field(..., min_length=2)
    document_type: str = "OWNERSHIP_RECORD"
    file_format: str = "PDF"
    source: str = "Sub-Registrar Office / Tehsil Record Room"
    metadata_json: Dict[str, Any] = {}


def resolve_user_projection_role(
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_user_role: Optional[str] = Header(None, description="[DEV ONLY] Fallback test role header"),
) -> str:
    """
    Determines the effective projection role for parcel data masking.
    Prioritizes authenticated user permissions, with development header fallback.
    """
    if current_user:
        if current_user.has_role("ADMIN"):
            return "ADMIN"
        if current_user.has_role("SURVEYOR") or current_user.has_role("GOVERNMENT_OFFICIAL"):
            return "SURVEYOR"
        return "PUBLIC"

    if x_user_role:
        role = x_user_role.upper().strip()
        if role in ("PUBLIC", "SURVEYOR", "ADMIN", "GOVERNMENT_OFFICIAL"):
            return "SURVEYOR" if role == "GOVERNMENT_OFFICIAL" else role

    # Fallback in dev/test mode
    from app.core.config import settings
    if settings.ALLOW_DEV_HEADER_AUTH:
        return "SURVEYOR"

    return "PUBLIC"



# ------------------------------------------------------------------------------
# 1. Parcel Core Endpoints
# ------------------------------------------------------------------------------

@router.get("/parcels")
def list_parcels(
    village: Optional[str] = Query(None, description="Filter by village name"),
    survey_number: Optional[str] = Query(None, description="Filter by survey / Khasra number"),
    land_use: Optional[str] = Query(None, description="Filter by official land use"),
    verification_status: Optional[str] = Query(None, description="Filter by verification status"),
    search_query: Optional[str] = Query(None, description="Search across parcel ID, survey no, village"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    role: str = Depends(resolve_user_projection_role),
    db: Session = Depends(get_db),
):
    """
    Returns list of cadastral parcels with role-aware privacy masking (Public, Surveyor, Admin).
    """
    service = ParcelService(db)
    result = service.get_parcels(
        role=role,
        village=village,
        survey_number=survey_number,
        land_use=land_use,
        verification_status=verification_status,
        search_query=search_query,
        skip=skip,
        limit=limit,
    )
    return StandardResponse.success_response(data=result)


@router.get("/parcels/spatial-query")
def spatial_query_parcels(
    min_lon: Optional[float] = Query(None),
    min_lat: Optional[float] = Query(None),
    max_lon: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None),
    center_lon: Optional[float] = Query(None),
    center_lat: Optional[float] = Query(None),
    radius_meters: Optional[float] = Query(None),
    village: Optional[str] = Query(None),
    survey_number: Optional[str] = Query(None),
    land_use: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    role: str = Depends(resolve_user_projection_role),
    db: Session = Depends(get_db),
):
    """
    Executes high-performance spatial query against parcel geometries using bounding box or radius.
    """
    bbox = [min_lon, min_lat, max_lon, max_lat] if all(v is not None for v in (min_lon, min_lat, max_lon, max_lat)) else None
    service = ParcelService(db)
    result = service.spatial_query(
        bbox=bbox,
        center_lon=center_lon,
        center_lat=center_lat,
        radius_meters=radius_meters,
        village=village,
        survey_number=survey_number,
        land_use=land_use,
        verification_status=verification_status,
        role=role,
        limit=limit,
    )
    return StandardResponse.success_response(data=result)


@router.get("/cadastral/layer")
def get_cadastral_layer(
    role: str = Depends(resolve_user_projection_role),
    db: Session = Depends(get_db),
):
    """
    Returns standard GeoJSON FeatureCollection of all cadastral parcels for GIS map layer overlay.
    """
    service = ParcelService(db)
    layer = service.get_cadastral_layer_geojson(role=role)
    return StandardResponse.success_response(data=layer)


@router.get("/parcels/{parcel_id}")
def get_parcel_detail(
    parcel_id: str,
    role: str = Depends(resolve_user_projection_role),
    db: Session = Depends(get_db),
):
    """
    Returns comprehensive details for a single parcel.
    """
    service = ParcelService(db)
    parcel = service.get_parcel_by_id(parcel_id, role=role)
    if not parcel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Parcel {parcel_id} not found")
    return StandardResponse.success_response(data=parcel)


# ------------------------------------------------------------------------------
# 2. Parcel Sub-Resources (Ownership, History, Changes, Documents, Comparison)
# ------------------------------------------------------------------------------

@router.get("/parcels/{parcel_id}/ownership")
def get_parcel_ownership(
    parcel_id: str,
    role: str = Depends(resolve_user_projection_role),
    db: Session = Depends(get_db),
):
    """
    Returns ownership title records and legal Khatedar relationships.
    """
    service = ParcelService(db)
    ownership = service.get_parcel_ownership(parcel_id, role=role)
    if "error" in ownership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ownership["error"])
    return StandardResponse.success_response(data=ownership)


@router.get("/parcels/{parcel_id}/history")
def get_parcel_history(
    parcel_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns historical evolution of boundaries and revenue settlement versions (1998, 2015, 2024, 2026).
    """
    service = ParcelService(db)
    history = service.get_parcel_history(parcel_id)
    if "error" in history:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=history["error"])
    return StandardResponse.success_response(data=history)


@router.get("/parcels/{parcel_id}/changes")
def get_parcel_changes(
    parcel_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns parcel-level Prompt 4 AI change detection results and encroachment alerts.
    """
    service = ParcelService(db)
    changes = service.get_parcel_changes(parcel_id)
    if "error" in changes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=changes["error"])
    return StandardResponse.success_response(data=changes)


@router.get("/parcels/{parcel_id}/documents")
def get_parcel_documents(
    parcel_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns metadata and storage references for documents associated with the parcel.
    """
    service = ParcelService(db)
    documents = service.get_parcel_documents(parcel_id)
    if "error" in documents:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=documents["error"])
    return StandardResponse.success_response(data=documents)


@router.get("/parcels/{parcel_id}/comparison")
def get_parcel_comparison(
    parcel_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns 4-way area and geometry comparison (Official vs Historical vs Drone vs Verified).
    """
    service = ParcelService(db)
    try:
        comparison = service.get_parcel_comparison(parcel_id)
        return StandardResponse.success_response(data=comparison.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/parcels/{parcel_id}/match")
def match_parcel_geometry(
    parcel_id: str,
    current_user: User = Depends(require_permission(Permissions.PARCEL_UPDATE)),
    db: Session = Depends(get_db),
):
    """
    Triggers multi-factor geospatial matching between official cadastre and drone-detected geometry.
    """
    service = ParcelService(db)
    try:
        match_result = service.match_parcel(parcel_id)
        return StandardResponse.success_response(data=match_result, message="Parcel matched successfully")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/parcels/{parcel_id}/verify")
def verify_parcel_boundary(
    parcel_id: str,
    payload: ParcelVerificationRequest,
    current_user: User = Depends(require_permission(Permissions.PARCEL_VERIFY)),
    db: Session = Depends(get_db),
):
    """
    Authorizes surveyor verification of parcel boundary, preserving audit history.
    """
    service = ParcelService(db)
    try:
        result = service.verify_parcel(parcel_id, payload)
        return StandardResponse.success_response(data=result, message="Parcel verified successfully")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/parcels/{parcel_id}/documents", status_code=status.HTTP_201_CREATED)
def attach_parcel_document(
    parcel_id: str,
    payload: DocumentUploadPayload,
    current_user: User = Depends(require_permission(Permissions.DOCUMENT_UPLOAD)),
    db: Session = Depends(get_db),
):
    """
    Attaches a document (ownership record, cadastral map, mutation deed) to a parcel.
    """
    service = ParcelDocumentService(db)
    try:
        doc = service.add_document(
            parcel_id=parcel_id,
            title=payload.title,
            document_type=payload.document_type,
            file_format=payload.file_format,
            source=payload.source,
            metadata_json=payload.metadata_json,
        )
        return StandardResponse.success_response(data=doc.model_dump(), message="Document attached successfully")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ------------------------------------------------------------------------------
# 3. Land Records Import System Endpoints
# ------------------------------------------------------------------------------

@router.post("/land-records/import", status_code=status.HTTP_201_CREATED)
def import_land_records(
    payload: LandRecordImportRequest,
    current_user: User = Depends(require_permission(Permissions.LAND_RECORD_IMPORT)),
    db: Session = Depends(get_db),
):
    """
    Batch imports land records from CSV, JSON, GeoJSON, or mock datasets.
    """
    service = LandRecordService(db)
    result = service.import_records(payload)
    return StandardResponse.success_response(data=result.model_dump(), message="Land records import session completed")



@router.get("/land-records/import-sessions")
def list_import_sessions(
    db: Session = Depends(get_db),
):
    """
    Lists all previous land-record batch import sessions and their statuses.
    """
    service = LandRecordService(db)
    sessions = service.list_import_sessions()
    return StandardResponse.success_response(data=[s.model_dump() for s in sessions])


@router.get("/land-records/import-sessions/{session_id}")
def get_import_session_detail(
    session_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieves full details and validation logs for an import session.
    """
    service = LandRecordService(db)
    detail = service.get_import_session_detail(session_id)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Import session {session_id} not found")
    return StandardResponse.success_response(data=detail.model_dump())
