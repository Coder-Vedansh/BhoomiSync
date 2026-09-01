import io
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.reports.models import (
    SurveyReport,
    ReportSection,
    ReportGenerationJob,
    ReportExport,
    ReportAuditLog,
    ReportStatus,
    ReportType,
    ExportFormat,
    ReportSectionKey,
)
from app.models.survey import Survey
from app.models.parcel import Parcel
from app.models.land_records import LandParcel
from app.models.auth import User

from app.modules.reporting.schemas.report_schemas import (
    ReportCreatePayload,
    ReportFilterParams,
    SurveyReportSummaryDTO,
    SurveyReportDetailDTO,
    ReportSectionDTO,
    ReportExportDTO,
    ReportValidationResult,
)
from app.modules.reporting.services.snapshot_service import ReportSnapshotService
from app.modules.reporting.services.report_validation_service import ReportValidationService
from app.modules.reporting.services.report_number_service import ReportNumberService
from app.modules.reporting.generators import GENERATORS_MAP
from app.modules.cloud_ingestion.storage_provider import get_storage_provider
from app.modules.auth.audit_service import SecurityAuditService


class ReportService:
    """
    Central Orchestration Service for Digital Land Survey Reports & Exports.
    """

    ALL_SECTION_KEYS = [
        ReportSectionKey.EXECUTIVE_SUMMARY,
        ReportSectionKey.PARCEL_INFORMATION,
        ReportSectionKey.OWNERSHIP,
        ReportSectionKey.BOUNDARY_ANALYSIS,
        ReportSectionKey.AREA_ANALYSIS,
        ReportSectionKey.DRONE_DATA,
        ReportSectionKey.ORTHOMOSAIC,
        ReportSectionKey.LIDAR,
        ReportSectionKey.RTK_ACCURACY,
        ReportSectionKey.LAND_CLASSIFICATION,
        ReportSectionKey.TERRAIN_ANALYSIS,
        ReportSectionKey.HISTORICAL_COMPARISON,
        ReportSectionKey.CHANGE_DETECTION,
        ReportSectionKey.ENCROACHMENT,
        ReportSectionKey.SURVEYOR_VERIFICATION,
        ReportSectionKey.AUDIT_TRAIL,
        ReportSectionKey.DISCLAIMER,
    ]

    @classmethod
    def create_draft_report(
        cls,
        db: Session,
        payload: ReportCreatePayload,
        current_user: Optional[User] = None,
    ) -> SurveyReport:
        """
        Creates a new draft survey report and initializes default sections.
        """
        user_name = current_user.full_name or current_user.username if current_user else "System Surveyor"
        user_role = current_user.roles[0].name if (current_user and current_user.roles) else "SURVEYOR"

        # Check existing version count for this parcel
        existing_count = db.query(SurveyReport).filter(
            SurveyReport.survey_id == payload.survey_id,
            SurveyReport.parcel_id == payload.parcel_id,
        ).count()
        next_version = existing_count + 1

        report_id = ReportNumberService.generate_report_id(payload.survey_id, payload.parcel_id, next_version)
        report_number = ReportNumberService.generate_official_report_number(
            khasra_no=payload.parcel_id.replace("BS-P-", "10") if "BS-P-" in payload.parcel_id else payload.parcel_id,
            version=next_version,
        )

        title = payload.title or f"Digital Cadastral Survey Report - Khasra #{payload.parcel_id}"
        summary = payload.summary or "Official digital survey dossier integrating aerial drone photogrammetry, airborne LiDAR, and RTK GNSS."

        included_keys = payload.included_sections or [k.value for k in cls.ALL_SECTION_KEYS]

        report = SurveyReport(
            report_id=report_id,
            report_number=report_number,
            survey_id=payload.survey_id,
            parcel_id=payload.parcel_id,
            report_type=payload.report_type,
            version=next_version,
            status=ReportStatus.DRAFT,
            title=title,
            summary=summary,
            preferred_unit=payload.preferred_unit,
            included_sections_json=included_keys,
            verification_status="AI_DETECTED",
            requested_by=user_name,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        # Initialize sections
        for idx, key_enum in enumerate(cls.ALL_SECTION_KEYS):
            sec = ReportSection(
                report_id=report.id,
                section_key=key_enum,
                title=key_enum.value.replace("_", " ").title(),
                order_index=idx,
                content_json={},
                is_included=key_enum.value in included_keys,
                created_at=datetime.utcnow(),
            )
            db.add(sec)

        # Audit log
        cls._log_report_audit(
            db=db,
            report=report,
            action="REPORT_CREATED",
            user=current_user,
            details={"version": next_version, "report_number": report_number},
        )

        db.commit()
        db.refresh(report)
        return report

    @classmethod
    def generate_report(
        cls,
        db: Session,
        report_id: str,
        current_user: Optional[User] = None,
    ) -> SurveyReport:
        """
        Executes full report generation:
        1. Captures immutable snapshot & calculates SHA-256 checksum.
        2. Populates structured ReportSection items.
        3. Generates all 5 export formats (PDF, GeoJSON, KML, CSV, JSON).
        4. Uploads exports to cloud storage abstraction.
        5. Updates report status to GENERATED.
        """
        report = db.query(SurveyReport).filter(SurveyReport.report_id == report_id).first()
        if not report:
            raise ValueError(f"Survey report '{report_id}' not found.")

        user_name = current_user.full_name or current_user.username if current_user else "System Surveyor"
        user_role = current_user.roles[0].name if (current_user and current_user.roles) else "SURVEYOR"

        # Create Generation Job record
        job_id = f"JOB-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:4].upper()}"
        job = ReportGenerationJob(
            job_id=job_id,
            report_id=report.id,
            status="PROCESSING",
            progress_percentage=10,
            current_stage="Capturing Immutable Snapshot",
            started_at=datetime.utcnow(),
        )
        db.add(job)
        report.status = ReportStatus.GENERATING
        db.commit()

        try:
            # 1. Create Immutable Snapshot
            snapshot = ReportSnapshotService.create_snapshot(
                db=db,
                survey_id=report.survey_id,
                parcel_id_str=report.parcel_id,
                user_role=user_role,
                preferred_unit=report.preferred_unit,
            )
            checksum = ReportSnapshotService.calculate_snapshot_checksum(snapshot)
            report.data_snapshot = snapshot
            report.snapshot_checksum_sha256 = checksum
            report.verification_status = snapshot.get("surveyor_verification", {}).get("verification_status", "AI_DETECTED")

            job.progress_percentage = 35
            job.current_stage = "Populating Structured Sections"
            db.commit()

            # 2. Update Sections content
            for sec in report.sections:
                k = sec.section_key
                if k == ReportSectionKey.EXECUTIVE_SUMMARY:
                    sec.content_json = snapshot.get("parcel_and_location", {})
                elif k in (ReportSectionKey.PARCEL_INFORMATION, ReportSectionKey.OWNERSHIP):
                    sec.content_json = snapshot.get("ownership_records", {})
                elif k in (ReportSectionKey.BOUNDARY_ANALYSIS, ReportSectionKey.ORTHOMOSAIC):
                    sec.content_json = snapshot.get("boundary_analysis", {})
                elif k in (ReportSectionKey.AREA_ANALYSIS, ReportSectionKey.TERRAIN_ANALYSIS):
                    sec.content_json = snapshot.get("geospatial_measurements", {})
                elif k in (ReportSectionKey.DRONE_DATA, ReportSectionKey.LIDAR, ReportSectionKey.RTK_ACCURACY):
                    sec.content_json = snapshot.get("drone_survey_and_sensors", {})
                elif k == ReportSectionKey.LAND_CLASSIFICATION:
                    sec.content_json = snapshot.get("ai_land_classification", {})
                elif k in (ReportSectionKey.HISTORICAL_COMPARISON, ReportSectionKey.CHANGE_DETECTION, ReportSectionKey.ENCROACHMENT):
                    sec.content_json = snapshot.get("change_and_encroachment", {})
                elif k == ReportSectionKey.SURVEYOR_VERIFICATION:
                    sec.content_json = snapshot.get("surveyor_verification", {})
                elif k == ReportSectionKey.DISCLAIMER:
                    sec.content_json = snapshot.get("disclaimers", {})

            job.progress_percentage = 55
            job.current_stage = "Rendering PDF & GIS Digital Exports"
            db.commit()

            # 3. Generate and Store All 5 Exports
            storage = get_storage_provider()
            export_formats = ["PDF", "GEOJSON", "KML", "CSV", "JSON"]
            
            # Remove previous exports for this report
            db.query(ReportExport).filter(ReportExport.report_id == report.id).delete()

            for fmt_name in export_formats:
                generator_cls = GENERATORS_MAP.get(fmt_name)
                if not generator_cls:
                    continue
                gen = generator_cls()
                file_bytes = gen.generate(
                    snapshot,
                    report_number=report.report_number,
                    checksum_sha256=checksum,
                )
                file_checksum = gen.calculate_checksum(file_bytes)
                file_name = f"{report.report_id.lower()}_{fmt_name.lower()}.{gen.file_extension}"
                storage_key = f"reports/{report.report_id}/{file_name}"

                # Upload to storage abstraction
                bio = io.BytesIO(file_bytes)
                storage.upload_file(
                    file_obj=bio,
                    destination_key=storage_key,
                    content_type=gen.mime_type,
                    metadata={"report_id": report.report_id, "format": fmt_name},
                )

                export_entry = ReportExport(
                    export_id=f"EXP-{report.report_id}-{fmt_name}",
                    report_id=report.id,
                    file_name=file_name,
                    file_format=ExportFormat(fmt_name),
                    storage_provider=storage.bucket if hasattr(storage, "bucket") else "LOCAL",
                    storage_key=storage_key,
                    checksum_sha256=file_checksum,
                    file_size_bytes=len(file_bytes),
                    mime_type=gen.mime_type,
                    download_url=f"/api/v1/reports/{report.report_id}/{fmt_name.lower()}",
                    status="READY",
                    created_by=user_name,
                    created_at=datetime.utcnow(),
                )
                db.add(export_entry)

            job.progress_percentage = 90
            job.current_stage = "Finalizing Digital Audit Signatures"
            db.commit()

            # 4. Finalize Report State
            report.status = ReportStatus.GENERATED
            report.generated_at = datetime.utcnow()
            report.updated_at = datetime.utcnow()

            job.status = "COMPLETED"
            job.progress_percentage = 100
            job.current_stage = "Completed"
            job.completed_at = datetime.utcnow()

            cls._log_report_audit(
                db=db,
                report=report,
                action="REPORT_GENERATED",
                user=current_user,
                details={"checksum_sha256": checksum, "exports_count": len(export_formats)},
            )

            db.commit()
            db.refresh(report)
            return report

        except Exception as e:
            db.rollback()
            job.status = "FAILED"
            job.error_message = str(e)
            report.status = ReportStatus.FAILED
            db.commit()
            raise e

    @classmethod
    def submit_for_review(
        cls,
        db: Session,
        report_id: str,
        comment: Optional[str] = None,
        current_user: Optional[User] = None,
    ) -> SurveyReport:
        """Submits generated report for administrative / surveyor sign-off."""
        report = db.query(SurveyReport).filter(SurveyReport.report_id == report_id).first()
        if not report:
            raise ValueError(f"Report '{report_id}' not found.")

        report.status = ReportStatus.UNDER_REVIEW
        report.submitted_at = datetime.utcnow()
        report.updated_at = datetime.utcnow()

        cls._log_report_audit(
            db=db,
            report=report,
            action="REPORT_SUBMITTED",
            user=current_user,
            details={"comment": comment},
        )
        db.commit()
        db.refresh(report)
        return report

    @classmethod
    def approve_report(
        cls,
        db: Session,
        report_id: str,
        approver_name: Optional[str] = None,
        notes: Optional[str] = None,
        current_user: Optional[User] = None,
    ) -> SurveyReport:
        """Approves survey report (Revenue Official / Admin role only)."""
        report = db.query(SurveyReport).filter(SurveyReport.report_id == report_id).first()
        if not report:
            raise ValueError(f"Report '{report_id}' not found.")

        officer = approver_name or (current_user.full_name if current_user else "Tehsildar Girwa")
        report.status = ReportStatus.APPROVED
        report.approved_by = officer
        report.approved_at = datetime.utcnow()
        report.updated_at = datetime.utcnow()

        cls._log_report_audit(
            db=db,
            report=report,
            action="REPORT_APPROVED",
            user=current_user,
            details={"approved_by": officer, "notes": notes},
        )
        db.commit()
        db.refresh(report)
        return report

    @classmethod
    def reject_report(
        cls,
        db: Session,
        report_id: str,
        reason: str,
        current_user: Optional[User] = None,
    ) -> SurveyReport:
        """Rejects survey report and requests field resurvey."""
        report = db.query(SurveyReport).filter(SurveyReport.report_id == report_id).first()
        if not report:
            raise ValueError(f"Report '{report_id}' not found.")

        officer = current_user.full_name or current_user.username if current_user else "Official"
        report.status = ReportStatus.REJECTED
        report.rejected_by = officer
        report.rejection_reason = reason
        report.updated_at = datetime.utcnow()

        cls._log_report_audit(
            db=db,
            report=report,
            action="REPORT_REJECTED",
            user=current_user,
            details={"rejected_by": officer, "reason": reason},
        )
        db.commit()
        db.refresh(report)
        return report

    @classmethod
    def archive_report(
        cls,
        db: Session,
        report_id: str,
        current_user: Optional[User] = None,
    ) -> SurveyReport:
        """Archives survey report."""
        report = db.query(SurveyReport).filter(SurveyReport.report_id == report_id).first()
        if not report:
            raise ValueError(f"Report '{report_id}' not found.")

        report.status = ReportStatus.ARCHIVED
        report.archived_at = datetime.utcnow()
        report.updated_at = datetime.utcnow()

        cls._log_report_audit(
            db=db,
            report=report,
            action="REPORT_ARCHIVED",
            user=current_user,
            details={"archived_at": report.archived_at.isoformat()},
        )
        db.commit()
        db.refresh(report)
        return report

    @classmethod
    def get_export_file_content(
        cls,
        db: Session,
        report_id: str,
        format_name: str,
        current_user: Optional[User] = None,
    ) -> Tuple[bytes, str, str]:
        """
        Retrieves file bytes, mime type, and filename for download endpoints.
        """
        report = db.query(SurveyReport).filter(SurveyReport.report_id == report_id).first()
        if not report:
            raise ValueError(f"Report '{report_id}' not found.")

        fmt_upper = format_name.upper()
        export = db.query(ReportExport).filter(
            ReportExport.report_id == report.id,
            ReportExport.file_format == ExportFormat(fmt_upper),
        ).first()

        storage = get_storage_provider()

        if export:
            try:
                raw_bytes = storage.download_file(export.storage_key)
                cls._log_report_audit(
                    db=db,
                    report=report,
                    action="REPORT_DOWNLOADED",
                    user=current_user,
                    details={"format": fmt_upper, "file_name": export.file_name},
                )
                return raw_bytes, export.mime_type, export.file_name
            except Exception:
                pass  # Regenerate on the fly if file missing from disk

        # Generate on the fly if needed
        generator_cls = GENERATORS_MAP.get(fmt_upper)
        if not generator_cls:
            raise ValueError(f"Unsupported export format '{format_name}'.")

        snapshot = report.data_snapshot or ReportSnapshotService.create_snapshot(
            db=db,
            survey_id=report.survey_id,
            parcel_id_str=report.parcel_id,
        )
        gen = generator_cls()
        raw_bytes = gen.generate(
            snapshot,
            report_number=report.report_number,
            checksum_sha256=report.snapshot_checksum_sha256,
        )
        file_name = f"{report.report_id.lower()}_{fmt_upper.lower()}.{gen.file_extension}"

        cls._log_report_audit(
            db=db,
            report=report,
            action="REPORT_EXPORTED",
            user=current_user,
            details={"format": fmt_upper, "file_name": file_name},
        )

        return raw_bytes, gen.mime_type, file_name

    @classmethod
    def list_reports(
        cls,
        db: Session,
        params: ReportFilterParams,
    ) -> Tuple[List[SurveyReportSummaryDTO], int]:
        """Lists reports matching query criteria."""
        q = db.query(SurveyReport)
        if params.survey_id is not None:
            q = q.filter(SurveyReport.survey_id == params.survey_id)
        if params.parcel_id:
            q = q.filter(SurveyReport.parcel_id == params.parcel_id)
        if params.report_type:
            q = q.filter(SurveyReport.report_type == params.report_type)
        if params.status:
            q = q.filter(SurveyReport.status == params.status)
        if params.verification_status:
            q = q.filter(SurveyReport.verification_status == params.verification_status)

        total = q.count()
        reports = q.order_by(desc(SurveyReport.created_at)).offset(params.skip).limit(params.limit).all()

        dtos = []
        for r in reports:
            dtos.append(SurveyReportSummaryDTO(
                id=r.id,
                report_id=r.report_id,
                report_number=r.report_number,
                survey_id=r.survey_id,
                parcel_id=r.parcel_id,
                report_type=r.report_type.value,
                version=r.version,
                status=r.status.value,
                title=r.title,
                summary=r.summary,
                snapshot_checksum_sha256=r.snapshot_checksum_sha256,
                preferred_unit=r.preferred_unit,
                verification_status=r.verification_status,
                requested_by=r.requested_by,
                approved_by=r.approved_by,
                generated_at=r.generated_at,
                approved_at=r.approved_at,
                created_at=r.created_at,
                updated_at=r.updated_at,
                export_count=len(r.exports),
            ))
        return dtos, total

    @classmethod
    def get_report_detail(
        cls,
        db: Session,
        report_id: str,
    ) -> SurveyReportDetailDTO:
        """Retrieves comprehensive report detail with snapshot and validation status."""
        r = db.query(SurveyReport).filter(SurveyReport.report_id == report_id).first()
        if not r:
            raise ValueError(f"Report '{report_id}' not found.")

        validation = ReportValidationService.validate_pre_generation(
            db=db,
            survey_id=r.survey_id,
            parcel_id_str=r.parcel_id,
        )

        section_dtos = [
            ReportSectionDTO(
                id=s.id,
                section_key=s.section_key.value,
                title=s.title,
                order_index=s.order_index,
                content=s.content_json or {},
                is_included=s.is_included,
            )
            for s in r.sections
        ]

        export_dtos = [
            ReportExportDTO(
                export_id=e.export_id,
                file_name=e.file_name,
                file_format=e.file_format.value,
                storage_provider=e.storage_provider,
                storage_key=e.storage_key,
                checksum_sha256=e.checksum_sha256,
                file_size_bytes=e.file_size_bytes,
                mime_type=e.mime_type,
                download_url=e.download_url,
                status=e.status,
                created_at=e.created_at,
            )
            for e in r.exports
        ]

        return SurveyReportDetailDTO(
            id=r.id,
            report_id=r.report_id,
            report_number=r.report_number,
            survey_id=r.survey_id,
            parcel_id=r.parcel_id,
            report_type=r.report_type.value,
            version=r.version,
            status=r.status.value,
            title=r.title,
            summary=r.summary,
            snapshot_checksum_sha256=r.snapshot_checksum_sha256,
            preferred_unit=r.preferred_unit,
            verification_status=r.verification_status,
            requested_by=r.requested_by,
            approved_by=r.approved_by,
            generated_at=r.generated_at,
            approved_at=r.approved_at,
            created_at=r.created_at,
            updated_at=r.updated_at,
            export_count=len(r.exports),
            data_snapshot=r.data_snapshot,
            included_sections=r.included_sections_json or [],
            sections=section_dtos,
            exports=export_dtos,
            validation=validation,
        )

    @classmethod
    def generate_demo_report(
        cls,
        db: Session,
        current_user: Optional[User] = None,
    ) -> SurveyReport:
        """
        1-Click Quick Generator: Generates a complete verified survey report for Haripura Village Khasra 101.
        """
        # Find Haripura reference survey
        survey = db.query(Survey).filter(Survey.survey_id == "SUR-2026-001").first()
        survey_id = survey.id if survey else 1

        payload = ReportCreatePayload(
            survey_id=survey_id,
            parcel_id="BS-P-001",
            report_type=ReportType.CADASTRAL_SURVEY,
            title="Haripura Village Pilot - Khasra #101 Comprehensive Cadastral Survey Report",
            summary="Full-spectrum drone photogrammetry, airborne LiDAR, and RTK georeferenced cadastral report for Khasra 101, Haripura, Udaipur, Rajasthan.",
            preferred_unit="m2",
        )
        draft = cls.create_draft_report(db, payload, current_user)
        generated = cls.generate_report(db, draft.report_id, current_user)
        return generated

    @staticmethod
    def _log_report_audit(
        db: Session,
        report: SurveyReport,
        action: str,
        user: Optional[User] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Logs audit entry for report actions in both ReportAuditLog and SecurityAuditService."""
        user_name = user.full_name or user.username if user else "System"
        user_id_str = str(user.id) if user else "0"
        user_role = user.roles[0].name if (user and user.roles) else "SYSTEM"

        log_entry = ReportAuditLog(
            report_id=report.id,
            action=action,
            user_id=user_id_str,
            username=user_name,
            role=user_role,
            details_json=details or {},
            timestamp=datetime.utcnow(),
        )
        db.add(log_entry)

        # Also register in Security Audit Log (Prompt 6 infrastructure)
        SecurityAuditService.log_event(
            db=db,
            action=action,
            user=user,
            resource_type="survey_report",
            resource_id=report.report_id,
            result="SUCCESS",
            metadata={"report_number": report.report_number, **(details or {})},
        )
