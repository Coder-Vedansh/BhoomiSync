from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.reports.models import ReportStatus, ReportType, ExportFormat, ReportSectionKey


class ReportCreatePayload(BaseModel):
    survey_id: int = Field(..., description="ID of the survey mission")
    parcel_id: str = Field(..., description="Parcel identifier (e.g. BS-P-001 or Khasra-101)")
    report_type: ReportType = Field(default=ReportType.CADASTRAL_SURVEY, description="Category of report")
    title: Optional[str] = Field(None, description="Custom title for the survey report")
    summary: Optional[str] = Field(None, description="Executive summary overview")
    preferred_unit: str = Field(default="m2", description="Display measurement unit (m2, hectares, acres)")
    included_sections: Optional[List[str]] = Field(None, description="List of section keys to include")


class ReportFilterParams(BaseModel):
    survey_id: Optional[int] = None
    parcel_id: Optional[str] = None
    report_type: Optional[ReportType] = None
    status: Optional[ReportStatus] = None
    verification_status: Optional[str] = None
    skip: int = 0
    limit: int = 50


class ReportSectionDTO(BaseModel):
    id: Optional[int] = None
    section_key: str
    title: str
    order_index: int
    content: Dict[str, Any]
    is_included: bool


class ReportExportDTO(BaseModel):
    export_id: str
    file_name: str
    file_format: str
    storage_provider: str
    storage_key: str
    checksum_sha256: str
    file_size_bytes: int
    mime_type: str
    download_url: Optional[str] = None
    status: str
    created_at: datetime


class ReportValidationResult(BaseModel):
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    quality_score: float = 1.0  # 0.0 to 1.0
    parcel_found: bool = True
    survey_found: bool = True
    geometry_valid: bool = True
    crs_valid: bool = True
    rtk_quality: str = "FIXED"
    verification_status: str = "AI_DETECTED"
    has_historical_comparison: bool = True
    has_ai_classification: bool = True


class SurveyReportSummaryDTO(BaseModel):
    id: int
    report_id: str
    report_number: str
    survey_id: int
    parcel_id: str
    report_type: str
    version: int
    status: str
    title: str
    summary: Optional[str] = None
    snapshot_checksum_sha256: Optional[str] = None
    preferred_unit: str
    verification_status: str
    requested_by: str
    approved_by: Optional[str] = None
    generated_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    export_count: int = 0


class SurveyReportDetailDTO(SurveyReportSummaryDTO):
    data_snapshot: Optional[Dict[str, Any]] = None
    included_sections: List[str] = []
    sections: List[ReportSectionDTO] = []
    exports: List[ReportExportDTO] = []
    validation: Optional[ReportValidationResult] = None


class ReportReviewPayload(BaseModel):
    comment: Optional[str] = Field(None, description="Review feedback or reviewer note")


class ReportApprovalPayload(BaseModel):
    approved_by_name: Optional[str] = Field(None, description="Official signature/name of the approving officer")
    notes: Optional[str] = Field(None, description="Approval conditions or mutation reference notes")


class ReportRejectionPayload(BaseModel):
    reason: str = Field(..., description="Reason for rejection or requested survey resurvey")
