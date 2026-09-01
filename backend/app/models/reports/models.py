import enum
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    JSON,
    Text,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


class ReportStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    GENERATING = "GENERATING"
    GENERATED = "GENERATED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ARCHIVED = "ARCHIVED"
    FAILED = "FAILED"


class ReportType(str, enum.Enum):
    CADASTRAL_SURVEY = "CADASTRAL_SURVEY"
    BOUNDARY_VERIFICATION = "BOUNDARY_VERIFICATION"
    DISPUTE_INVESTIGATION = "DISPUTE_INVESTIGATION"
    PUBLIC_INFORMATION = "PUBLIC_INFORMATION"
    CHANGE_DETECTION = "CHANGE_DETECTION"


class ExportFormat(str, enum.Enum):
    PDF = "PDF"
    JSON = "JSON"
    GEOJSON = "GEOJSON"
    CSV = "CSV"
    KML = "KML"


class ReportSectionKey(str, enum.Enum):
    EXECUTIVE_SUMMARY = "EXECUTIVE_SUMMARY"
    PARCEL_INFORMATION = "PARCEL_INFORMATION"
    OWNERSHIP = "OWNERSHIP"
    BOUNDARY_ANALYSIS = "BOUNDARY_ANALYSIS"
    AREA_ANALYSIS = "AREA_ANALYSIS"
    DRONE_DATA = "DRONE_DATA"
    ORTHOMOSAIC = "ORTHOMOSAIC"
    LIDAR = "LIDAR"
    RTK_ACCURACY = "RTK_ACCURACY"
    LAND_CLASSIFICATION = "LAND_CLASSIFICATION"
    TERRAIN_ANALYSIS = "TERRAIN_ANALYSIS"
    HISTORICAL_COMPARISON = "HISTORICAL_COMPARISON"
    CHANGE_DETECTION = "CHANGE_DETECTION"
    ENCROACHMENT = "ENCROACHMENT"
    SURVEYOR_VERIFICATION = "SURVEYOR_VERIFICATION"
    AUDIT_TRAIL = "AUDIT_TRAIL"
    DISCLAIMER = "DISCLAIMER"


class SurveyReport(Base):
    """
    SurveyReport Entity.
    Immutable snapshot and audit-ready digital survey dossier for a parcel/survey.
    """
    __tablename__ = "survey_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(64), unique=True, index=True, nullable=False)
    report_number = Column(String(128), unique=True, index=True, nullable=False)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False, index=True)
    parcel_id = Column(String(64), index=True, nullable=False)
    
    report_type = Column(Enum(ReportType), default=ReportType.CADASTRAL_SURVEY, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    status = Column(Enum(ReportStatus), default=ReportStatus.DRAFT, nullable=False)
    
    title = Column(String(256), nullable=False)
    summary = Column(Text, nullable=True)
    
    # Immutable JSON snapshot of all survey, parcel, AI, and sensor metrics at generation time
    data_snapshot = Column(JSON, nullable=True)
    snapshot_checksum_sha256 = Column(String(64), nullable=True)
    
    # Preferences & Configuration
    preferred_unit = Column(String(32), default="m2", nullable=False)  # m2, hectares, acres
    included_sections_json = Column(JSON, default=list, nullable=False)
    
    # Verification & Approval Metadata
    verification_status = Column(String(64), default="AI_DETECTED", nullable=False)
    requested_by = Column(String(128), nullable=False)
    reviewed_by = Column(String(128), nullable=True)
    approved_by = Column(String(128), nullable=True)
    rejected_by = Column(String(128), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    generated_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    survey = relationship("Survey")
    sections = relationship("ReportSection", back_populates="report", cascade="all, delete-orphan")
    exports = relationship("ReportExport", back_populates="report", cascade="all, delete-orphan")
    generation_jobs = relationship("ReportGenerationJob", back_populates="report", cascade="all, delete-orphan")
    audit_logs = relationship("ReportAuditLog", back_populates="report", cascade="all, delete-orphan")


class ReportSection(Base):
    """
    ReportSection Entity.
    Stores structured content for individual report pages/sections.
    """
    __tablename__ = "report_sections"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("survey_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    section_key = Column(Enum(ReportSectionKey), nullable=False)
    title = Column(String(128), nullable=False)
    order_index = Column(Integer, default=0, nullable=False)
    content_json = Column(JSON, default=dict, nullable=False)
    is_included = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    report = relationship("SurveyReport", back_populates="sections")


class ReportGenerationJob(Base):
    """
    ReportGenerationJob Entity.
    Tracks asynchronous execution of multi-format report and GIS export generation.
    """
    __tablename__ = "report_generation_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), unique=True, index=True, nullable=False)
    report_id = Column(Integer, ForeignKey("survey_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), default="QUEUED", nullable=False)  # QUEUED, PROCESSING, COMPLETED, FAILED
    progress_percentage = Column(Integer, default=0, nullable=False)
    current_stage = Column(String(128), default="Initialized", nullable=False)
    error_message = Column(Text, nullable=True)
    
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    report = relationship("SurveyReport", back_populates="generation_jobs")


class ReportExport(Base):
    """
    ReportExport Entity.
    Tracks generated digital artifacts (PDF, GeoJSON, KML, CSV, JSON) and storage locations.
    """
    __tablename__ = "report_exports"

    id = Column(Integer, primary_key=True, index=True)
    export_id = Column(String(64), unique=True, index=True, nullable=False)
    report_id = Column(Integer, ForeignKey("survey_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    
    file_name = Column(String(256), nullable=False)
    file_format = Column(Enum(ExportFormat), nullable=False)
    storage_provider = Column(String(32), default="MOCK", nullable=False)
    storage_key = Column(String(512), nullable=False)
    checksum_sha256 = Column(String(64), nullable=False)
    file_size_bytes = Column(Integer, default=0, nullable=False)
    mime_type = Column(String(128), nullable=False)
    download_url = Column(String(512), nullable=True)
    
    status = Column(String(32), default="READY", nullable=False)  # READY, GENERATING, FAILED, EXPIRED
    created_by = Column(String(128), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    report = relationship("SurveyReport", back_populates="exports")


class ReportAuditLog(Base):
    """
    ReportAuditLog Entity.
    Immutable log of all report creation, review, approval, rejection, export, and download operations.
    """
    __tablename__ = "report_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("survey_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(64), nullable=False)  # REPORT_CREATED, REPORT_GENERATION_STARTED, REPORT_GENERATED, REPORT_DOWNLOADED, REPORT_EXPORTED, REPORT_SUBMITTED, REPORT_APPROVED, REPORT_REJECTED, REPORT_ARCHIVED
    user_id = Column(String(64), nullable=True)
    username = Column(String(128), nullable=True)
    role = Column(String(64), nullable=True)
    ip_address = Column(String(64), nullable=True)
    details_json = Column(JSON, default=dict, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    report = relationship("SurveyReport", back_populates="audit_logs")
