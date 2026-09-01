from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.response import ApiResponse, success_response
from app.models.auth import User
from app.models.reports.models import ReportStatus, ReportType
from app.modules.auth.dependencies import get_current_user, require_permission, get_optional_current_user
from app.modules.auth.permissions import Permissions

from app.modules.reporting.schemas.report_schemas import (
    ReportCreatePayload,
    ReportFilterParams,
    SurveyReportSummaryDTO,
    SurveyReportDetailDTO,
    ReportValidationResult,
    ReportReviewPayload,
    ReportApprovalPayload,
    ReportRejectionPayload,
    ReportExportDTO,
)
from app.modules.reporting.services.report_service import ReportService
from app.modules.reporting.services.report_validation_service import ReportValidationService

router = APIRouter(prefix="/reports", tags=["Digital Survey Reports & Exports"])


@router.post("", response_model=ApiResponse[SurveyReportDetailDTO], status_code=status.HTTP_201_CREATED)
def create_survey_report(
    payload: ReportCreatePayload,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Creates a new draft survey report for a parcel and initializes default structured sections.
    """
    try:
        report = ReportService.create_draft_report(db, payload, current_user)
        detail = ReportService.get_report_detail(db, report.report_id)
        return success_response(data=detail)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=ApiResponse[List[SurveyReportSummaryDTO]])
def list_survey_reports(
    survey_id: Optional[int] = Query(None, description="Filter by survey ID"),
    parcel_id: Optional[str] = Query(None, description="Filter by parcel ID"),
    report_type: Optional[ReportType] = Query(None, description="Filter by report category"),
    status: Optional[ReportStatus] = Query(None, description="Filter by report lifecycle status"),
    verification_status: Optional[str] = Query(None, description="Filter by verification state"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Lists survey reports with comprehensive filtering options and pagination.
    """
    params = ReportFilterParams(
        survey_id=survey_id,
        parcel_id=parcel_id,
        report_type=report_type,
        status=status,
        verification_status=verification_status,
        skip=skip,
        limit=limit,
    )
    dtos, total = ReportService.list_reports(db, params)
    return success_response(data=dtos, meta={"total": total, "skip": skip, "limit": limit})


@router.post("/demo", response_model=ApiResponse[SurveyReportDetailDTO])
def generate_demo_survey_report(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    1-Click Quick Demo Generator: Generates a complete verified survey report for Haripura Khasra 101.
    """
    try:
        report = ReportService.generate_demo_report(db, current_user)
        detail = ReportService.get_report_detail(db, report.report_id)
        return success_response(data=detail)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{report_id}", response_model=ApiResponse[SurveyReportDetailDTO])
def get_survey_report_detail(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Retrieves full details of a survey report including immutable snapshot, sections, and exports.
    """
    try:
        detail = ReportService.get_report_detail(db, report_id)
        return success_response(data=detail)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@router.post("/{report_id}/generate", response_model=ApiResponse[SurveyReportDetailDTO])
def trigger_report_generation(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Triggers generation of the immutable snapshot and all 5 digital exports (PDF, GeoJSON, KML, CSV, JSON).
    """
    try:
        report = ReportService.generate_report(db, report_id, current_user)
        detail = ReportService.get_report_detail(db, report.report_id)
        return success_response(data=detail)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Generation failed: {str(e)}")


@router.post("/{report_id}/submit-review", response_model=ApiResponse[SurveyReportDetailDTO])
def submit_report_for_review(
    report_id: str,
    payload: Optional[ReportReviewPayload] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Submits a generated report for administrative / surveyor sign-off.
    """
    try:
        comment = payload.comment if payload else None
        report = ReportService.submit_for_review(db, report_id, comment, current_user)
        detail = ReportService.get_report_detail(db, report.report_id)
        return success_response(data=detail)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@router.post("/{report_id}/approve", response_model=ApiResponse[SurveyReportDetailDTO])
def approve_survey_report(
    report_id: str,
    payload: Optional[ReportApprovalPayload] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Officially approves a survey report (Government Official or Admin role required).
    """
    try:
        approver = payload.approved_by_name if payload else None
        notes = payload.notes if payload else None
        report = ReportService.approve_report(db, report_id, approver, notes, current_user)
        detail = ReportService.get_report_detail(db, report.report_id)
        return success_response(data=detail)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@router.post("/{report_id}/reject", response_model=ApiResponse[SurveyReportDetailDTO])
def reject_survey_report(
    report_id: str,
    payload: ReportRejectionPayload,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Rejects a survey report and records reasons for requested resurvey or correction.
    """
    try:
        report = ReportService.reject_report(db, report_id, payload.reason, current_user)
        detail = ReportService.get_report_detail(db, report.report_id)
        return success_response(data=detail)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@router.post("/{report_id}/archive", response_model=ApiResponse[SurveyReportDetailDTO])
def archive_survey_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Archives a historical survey report.
    """
    try:
        report = ReportService.archive_report(db, report_id, current_user)
        detail = ReportService.get_report_detail(db, report.report_id)
        return success_response(data=detail)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@router.get("/{report_id}/validation", response_model=ApiResponse[ReportValidationResult])
def get_report_validation_check(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Performs pre-generation topology, sensor quality, and verification checks.
    """
    detail = ReportService.get_report_detail(db, report_id)
    return success_response(data=detail.validation)


@router.get("/{report_id}/exports", response_model=ApiResponse[List[ReportExportDTO]])
def list_report_exports(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all generated digital exports (PDF, GeoJSON, KML, CSV, JSON) and their checksums.
    """
    detail = ReportService.get_report_detail(db, report_id)
    return success_response(data=detail.exports)


# =========================================================================
# DIGITAL EXPORT DOWNLOAD ENDPOINTS
# =========================================================================

@router.get("/{report_id}/pdf")
def download_report_pdf(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Downloads multi-page publication-grade PDF report."""
    raw_bytes, mime_type, file_name = ReportService.get_export_file_content(db, report_id, "PDF", current_user)
    return Response(
        content=raw_bytes,
        media_type=mime_type,
        headers={"Content-Disposition": f'inline; filename="{file_name}"'},
    )


@router.get("/{report_id}/geojson")
def download_report_geojson(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Downloads multi-layer Cadastral GeoJSON export."""
    raw_bytes, mime_type, file_name = ReportService.get_export_file_content(db, report_id, "GEOJSON", current_user)
    return Response(
        content=raw_bytes,
        media_type=mime_type,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


@router.get("/{report_id}/kml")
def download_report_kml(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Downloads Google Earth / QGIS compatible KML export."""
    raw_bytes, mime_type, file_name = ReportService.get_export_file_content(db, report_id, "KML", current_user)
    return Response(
        content=raw_bytes,
        media_type=mime_type,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


@router.get("/{report_id}/csv")
def download_report_csv(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Downloads tabular measurement metrics CSV export."""
    raw_bytes, mime_type, file_name = ReportService.get_export_file_content(db, report_id, "CSV", current_user)
    return Response(
        content=raw_bytes,
        media_type=mime_type,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


@router.get("/{report_id}/json")
def download_report_json(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Downloads structured machine-readable JSON export."""
    raw_bytes, mime_type, file_name = ReportService.get_export_file_content(db, report_id, "JSON", current_user)
    return Response(
        content=raw_bytes,
        media_type=mime_type,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )
