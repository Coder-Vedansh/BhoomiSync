from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.survey import Survey
from app.models.parcel import Parcel, VerificationStatus
from app.models.land_records import LandParcel
from app.models.ingestion import PositionRecord
from app.modules.reporting.schemas.report_schemas import ReportValidationResult


class ReportValidationService:
    """
    Validates parcel, survey, geometry, sensor data, and verification completeness
    prior to final digital survey report generation.
    """

    @classmethod
    def validate_pre_generation(
        cls,
        db: Session,
        survey_id: int,
        parcel_id_str: str,
    ) -> ReportValidationResult:
        errors: List[str] = []
        warnings: List[str] = []
        quality_score = 1.0

        # 1. Survey Check
        survey = db.query(Survey).filter(Survey.id == survey_id).first()
        survey_found = survey is not None
        if not survey_found:
            errors.append(f"Survey mission ID #{survey_id} not found in database.")
            quality_score -= 0.5

        # 2. Parcel Check
        parcel = db.query(Parcel).filter(
            Parcel.survey_id == survey_id,
            Parcel.parcel_id == parcel_id_str,
        ).first()

        land_parcel = db.query(LandParcel).filter(
            (LandParcel.survey_number == parcel_id_str) |
            (LandParcel.parcel_id == parcel_id_str)
        ).first()

        parcel_found = (parcel is not None) or (land_parcel is not None)
        if not parcel_found:
            errors.append(f"Parcel identifier '{parcel_id_str}' not found in survey or cadastral records.")
            quality_score -= 0.5

        # 3. Geometry Validation
        geom = parcel.geometry_geojson if parcel else (land_parcel.cadastral_geometry if land_parcel else None)

        geom_valid = True
        if geom:
            coords = geom.get("coordinates")
            if not coords or not isinstance(coords, list):
                errors.append("Invalid GeoJSON polygon structure: missing coordinates array.")
                geom_valid = False
                quality_score -= 0.3
            elif len(coords[0]) < 4:
                errors.append("Invalid polygon topology: closed ring must contain at least 4 coordinates.")
                geom_valid = False
                quality_score -= 0.2
        else:
            warnings.append("No active aerial drone geometry found for parcel. Using cadastral record reference.")
            quality_score -= 0.1

        # 4. RTK Quality Check
        rtk_records = db.query(PositionRecord).filter(PositionRecord.survey_id == survey_id).all()
        rtk_quality = "FIXED"
        if rtk_records:
            fix_statuses = [r.fix_status for r in rtk_records if r.fix_status]
            if any("FLOAT" in s for s in fix_statuses) and not any("FIXED" in s for s in fix_statuses):
                rtk_quality = "FLOAT"
                warnings.append("RTK GNSS positioning status is FLOAT instead of FIXED (centimeter precision degraded).")
                quality_score -= 0.1
            elif any("SINGLE" in s for s in fix_statuses) and not any("FIXED" in s for s in fix_statuses):
                rtk_quality = "SINGLE"
                warnings.append("RTK GNSS positioning status is SINGLE (sub-meter uncorrected accuracy).")
                quality_score -= 0.2
        else:
            warnings.append("No GNSS position telemetry records attached to survey. Using default sensor calibration.")


        # 5. Surveyor Verification Status
        ver_status = parcel.verification_status.value if parcel else "AI_DETECTED"
        if ver_status in ["AI_DETECTED", "AUTO_DETECTED", "PENDING"]:
            warnings.append("Surveyor field verification has not been signed off. Report contains unverified AI candidate boundaries.")
            quality_score -= 0.15

        # 6. Historical Cadastre Check
        has_historical = land_parcel is not None
        if not has_historical:
            warnings.append("Historical revenue cadastre record unavailable for cross-matching.")
            quality_score -= 0.05

        quality_score = max(0.0, min(1.0, round(quality_score, 2)))
        is_valid = len(errors) == 0

        return ReportValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            quality_score=quality_score,
            parcel_found=parcel_found,
            survey_found=survey_found,
            geometry_valid=geom_valid,
            crs_valid=True,
            rtk_quality=rtk_quality,
            verification_status=ver_status,
            has_historical_comparison=has_historical,
            has_ai_classification=True,
        )
