import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.survey import Survey
from app.models.parcel import Parcel, VerificationStatus, LandUseType
from app.models.ingestion import ProcessingJob, JobType, JobStatus
from app.models.ai_results import (
    AIInferenceResult,
    AIBoundaryResult,
    AIAuditLog,
    AIModelType,
    AIVerificationStatus,
)
from app.modules.ai.boundary_detection.detector import MultiSensorBoundaryDetector
from app.modules.geospatial_processing.measurement.measurement_engine import MeasurementEngine
from app.core.exceptions import NotFoundException, ValidationException


class BoundaryService:
    """
    Service Layer for AI Boundary Intelligence & Human-in-the-Loop Verification.
    """

    def __init__(self, db: Session):
        self.db = db
        self.detector = MultiSensorBoundaryDetector()

    def run_boundary_detection_pipeline(
        self,
        survey_id: str,
        dataset_id: Optional[str] = None,
        confidence_threshold: float = 0.60,
    ) -> Dict[str, Any]:
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_id).first()
        if not survey:
            raise NotFoundException(f"Survey {survey_id} not found")

        # 1. Register ProcessingJob
        job_id = f"JOB-AI-BND-{survey_id}-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:6].upper()}"
        job = ProcessingJob(
            job_id=job_id,
            job_type=JobType.AI_BOUNDARY_DETECTION,
            survey_id=survey.id,
            status=JobStatus.PROCESSING,
            progress_percentage=30.0,
            parameters_json={
                "survey_id": survey_id,
                "dataset_id": dataset_id,
                "confidence_threshold": confidence_threshold,
            },
            result_json={},
            created_at=datetime.utcnow(),
            started_at=datetime.utcnow(),
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        # 2. Run Boundary Intelligence
        spatial_context = {
            "survey_id": survey_id,
            "dataset_id": dataset_id or f"DS-{survey_id}-ORTHO",
            "spatial_bounds": {
                "min_lon": survey.center_longitude - 0.0035,
                "max_lon": survey.center_longitude + 0.0035,
                "min_lat": survey.center_latitude - 0.0030,
                "max_lat": survey.center_latitude + 0.0030,
            },
        }
        res = self.detector.detect_candidate_boundaries(
            survey_id=survey_id,
            spatial_context=spatial_context,
            confidence_threshold=confidence_threshold,
        )

        inference_id = f"INF-BND-{survey_id}-{uuid.uuid4().hex[:8].upper()}"
        inference_record = AIInferenceResult(
            inference_id=inference_id,
            survey_id=survey.id,
            job_id=job.id,
            model_id=res["model_id"],
            model_version=res["model_version"],
            inference_type=AIModelType.BOUNDARY_DETECTION,
            execution_time_ms=res["execution_time_ms"],
            confidence_overall=res["confidence_overall"],
            summary_metrics_json={"total_candidates": res["total_candidates"]},
            parameters_json=job.parameters_json,
            is_demo_simulation=True,
            created_at=datetime.utcnow(),
        )
        self.db.add(inference_record)
        self.db.commit()
        self.db.refresh(inference_record)

        # 3. Save Candidate Boundaries
        for c in res["candidates"]:
            existing = (
                self.db.query(AIBoundaryResult)
                .filter(AIBoundaryResult.boundary_id == c["boundary_id"])
                .first()
            )
            if not existing:
                bnd_rec = AIBoundaryResult(
                    boundary_id=c["boundary_id"],
                    inference_id=inference_record.id,
                    survey_id=survey.id,
                    boundary_type=c["boundary_type"],
                    confidence=c["confidence"],
                    sources_json=c["sources"],
                    geometry_geojson=c["geometry"],
                    crs=c.get("crs", "EPSG:4326"),
                    length_m=c.get("length_m", 0.0),
                    estimated_area_m2=c.get("estimated_area_m2", 0.0),
                    verification_status=AIVerificationStatus.CANDIDATE,
                    created_at=datetime.utcnow(),
                )
                self.db.add(bnd_rec)

        # 4. Complete Job
        job.status = JobStatus.COMPLETED
        job.progress_percentage = 100.0
        job.result_json = {
            "inference_id": inference_id,
            "total_candidates": res["total_candidates"],
            "confidence_overall": res["confidence_overall"],
        }
        job.completed_at = datetime.utcnow()
        self.db.commit()

        res["inference_id"] = inference_id
        res["job_id"] = job_id
        return res

    def get_survey_boundaries(self, survey_id: str) -> List[Dict[str, Any]]:
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_id).first()
        if not survey:
            raise NotFoundException(f"Survey {survey_id} not found")

        records = (
            self.db.query(AIBoundaryResult)
            .filter(AIBoundaryResult.survey_id == survey.id)
            .all()
        )
        if not records:
            demo = self.detector.detect_candidate_boundaries(survey_id, {})
            return demo["candidates"]

        return [
            {
                "boundary_id": r.boundary_id,
                "boundary_type": r.boundary_type,
                "confidence": r.confidence,
                "sources": r.sources_json,
                "geometry": r.geometry_geojson,
                "crs": r.crs,
                "length_m": r.length_m,
                "estimated_area_m2": r.estimated_area_m2,
                "verification_status": r.verification_status.value if hasattr(r.verification_status, "value") else str(r.verification_status),
                "surveyor_comment": r.surveyor_comment,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "verified_at": r.verified_at.isoformat() if r.verified_at else None,
            }
            for r in records
        ]

    def verify_candidate_boundary(
        self,
        boundary_id: str,
        comment: str = "Surveyor verified",
        khasra_no: Optional[str] = None,
        land_use: str = "AGRICULTURAL_CROP",
    ) -> Dict[str, Any]:
        bnd = self.db.query(AIBoundaryResult).filter(AIBoundaryResult.boundary_id == boundary_id).first()
        if not bnd:
            raise NotFoundException(f"Boundary {boundary_id} not found")

        orig_json = {
            "boundary_id": bnd.boundary_id,
            "verification_status": str(bnd.verification_status),
            "geometry": bnd.geometry_geojson,
        }

        bnd.verification_status = AIVerificationStatus.VERIFIED
        bnd.surveyor_comment = comment
        bnd.verified_at = datetime.utcnow()

        # Audit Log
        audit = AIAuditLog(
            target_type="BOUNDARY",
            target_id=boundary_id,
            user_action="ACCEPT_VERIFY",
            original_ai_result_json=orig_json,
            reason=comment,
            model_version="2.0.0",
            created_at=datetime.utcnow(),
        )
        self.db.add(audit)
        self.db.commit()

        return {
            "boundary_id": bnd.boundary_id,
            "status": "VERIFIED",
            "message": "Boundary candidate verified successfully by surveyor",
            "verified_at": bnd.verified_at.isoformat(),
        }

    def reject_candidate_boundary(self, boundary_id: str, reason: str) -> Dict[str, Any]:
        bnd = self.db.query(AIBoundaryResult).filter(AIBoundaryResult.boundary_id == boundary_id).first()
        if not bnd:
            raise NotFoundException(f"Boundary {boundary_id} not found")

        orig_json = {
            "boundary_id": bnd.boundary_id,
            "verification_status": str(bnd.verification_status),
            "geometry": bnd.geometry_geojson,
        }

        bnd.verification_status = AIVerificationStatus.REJECTED
        bnd.surveyor_comment = reason

        audit = AIAuditLog(
            target_type="BOUNDARY",
            target_id=boundary_id,
            user_action="REJECT",
            original_ai_result_json=orig_json,
            reason=reason,
            model_version="2.0.0",
            created_at=datetime.utcnow(),
        )
        self.db.add(audit)
        self.db.commit()

        return {
            "boundary_id": bnd.boundary_id,
            "status": "REJECTED",
            "reason": reason,
        }

    def edit_candidate_boundary(
        self,
        boundary_id: str,
        geometry_geojson: Dict[str, Any],
        comment: str = "Surveyor adjusted vertices",
    ) -> Dict[str, Any]:
        bnd = self.db.query(AIBoundaryResult).filter(AIBoundaryResult.boundary_id == boundary_id).first()
        if not bnd:
            raise NotFoundException(f"Boundary {boundary_id} not found")

        coords = geometry_geojson.get("coordinates", [[]])[0]
        if len(coords) < 3:
            raise ValidationException("Polygon must contain at least 3 vertices")

        metrics = MeasurementEngine.compute_comprehensive_parcel_metrics(coords, slope_deg=3.5)

        orig_json = {
            "boundary_id": bnd.boundary_id,
            "geometry": bnd.geometry_geojson,
            "length_m": bnd.length_m,
            "area_m2": bnd.estimated_area_m2,
        }

        bnd.geometry_geojson = geometry_geojson
        bnd.length_m = metrics["perimeter"]["meters"]
        bnd.estimated_area_m2 = metrics["planar_area"]["square_meters"]
        bnd.verification_status = AIVerificationStatus.MANUALLY_EDITED
        bnd.surveyor_comment = comment

        audit = AIAuditLog(
            target_type="BOUNDARY",
            target_id=boundary_id,
            user_action="EDIT_VERTICES",
            original_ai_result_json=orig_json,
            edited_geometry_geojson=geometry_geojson,
            reason=comment,
            model_version="2.0.0",
            created_at=datetime.utcnow(),
        )
        self.db.add(audit)
        self.db.commit()

        return {
            "boundary_id": bnd.boundary_id,
            "status": "MANUALLY_EDITED",
            "updated_length_m": bnd.length_m,
            "updated_area_m2": bnd.estimated_area_m2,
            "message": "Boundary vertices updated and scale-invariant metrics recalculated",
        }
