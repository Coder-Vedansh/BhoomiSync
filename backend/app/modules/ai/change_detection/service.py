import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.survey import Survey
from app.models.ingestion import ProcessingJob, JobType, JobStatus
from app.models.ai_results import (
    AIInferenceResult,
    AIChangeResult,
    AIModelType,
    AIChangeSeverity,
)
from app.modules.ai.change_detection.change_detector import HistoricalChangeDetector
from app.core.exceptions import NotFoundException


class ChangeDetectionService:
    """
    Service Layer for AI Change Detection & Potential Encroachment Alerts.
    """

    def __init__(self, db: Session):
        self.db = db
        self.detector = HistoricalChangeDetector()

    def run_change_detection_pipeline(
        self,
        survey_id: str,
        historical_dataset_id: Optional[str] = None,
        current_dataset_id: Optional[str] = None,
        confidence_threshold: float = 0.60,
    ) -> Dict[str, Any]:
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_id).first()
        if not survey:
            raise NotFoundException(f"Survey {survey_id} not found")

        # 1. Register ProcessingJob
        job_id = f"JOB-AI-CHG-{survey_id}-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:6].upper()}"
        job = ProcessingJob(
            job_id=job_id,
            job_type=JobType.AI_CHANGE_DETECTION,
            survey_id=survey.id,
            status=JobStatus.PROCESSING,
            progress_percentage=25.0,
            parameters_json={
                "survey_id": survey_id,
                "historical_dataset_id": historical_dataset_id or "DS-1998-CADASTRE",
                "current_dataset_id": current_dataset_id or f"DS-{survey_id}-ORTHO",
                "confidence_threshold": confidence_threshold,
            },
            result_json={},
            created_at=datetime.utcnow(),
            started_at=datetime.utcnow(),
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        # 2. Run Change Detection
        spatial_context = {
            "survey_id": survey_id,
            "historical_dataset_id": historical_dataset_id or "DS-1998-CADASTRE",
            "current_dataset_id": current_dataset_id or f"DS-{survey_id}-ORTHO",
        }
        res = self.detector.detect_historical_changes(
            survey_id=survey_id,
            spatial_context=spatial_context,
            confidence_threshold=confidence_threshold,
        )

        inference_id = f"INF-CHG-{survey_id}-{uuid.uuid4().hex[:8].upper()}"
        inference_record = AIInferenceResult(
            inference_id=inference_id,
            survey_id=survey.id,
            job_id=job.id,
            model_id=res["model_id"],
            model_version=res["model_version"],
            inference_type=AIModelType.CHANGE_DETECTION,
            execution_time_ms=res["execution_time_ms"],
            confidence_overall=0.92,
            summary_metrics_json={
                "total_changes": res["total_changes"],
                "potential_encroachments_count": res["potential_encroachments_count"],
            },
            parameters_json=job.parameters_json,
            is_demo_simulation=True,
            created_at=datetime.utcnow(),
        )
        self.db.add(inference_record)
        self.db.commit()
        self.db.refresh(inference_record)

        # 3. Save Change Records
        for c in res["changes"]:
            existing = (
                self.db.query(AIChangeResult)
                .filter(AIChangeResult.change_id == c["change_id"])
                .first()
            )
            if not existing:
                sev = getattr(AIChangeSeverity, c["severity"], AIChangeSeverity.MEDIUM)
                chg_rec = AIChangeResult(
                    change_id=c["change_id"],
                    inference_id=inference_record.id,
                    survey_id=survey.id,
                    change_type=c["change_type"],
                    severity=sev,
                    old_value=c["old_value"],
                    new_value=c["new_value"],
                    area_affected_m2=c["area_affected_m2"],
                    percentage_change=c["percentage_change"],
                    confidence=c["confidence"],
                    geometry_geojson=c["geometry"],
                    crs=c.get("crs", "EPSG:4326"),
                    historical_dataset_id=c.get("historical_dataset_id"),
                    current_dataset_id=c.get("current_dataset_id"),
                    audit_status="PENDING_SURVEYOR_REVIEW",
                    created_at=datetime.utcnow(),
                )
                self.db.add(chg_rec)

        # 4. Complete Job
        job.status = JobStatus.COMPLETED
        job.progress_percentage = 100.0
        job.result_json = {
            "inference_id": inference_id,
            "total_changes": res["total_changes"],
            "potential_encroachments_count": res["potential_encroachments_count"],
        }
        job.completed_at = datetime.utcnow()
        self.db.commit()

        res["inference_id"] = inference_id
        res["job_id"] = job_id
        return res

    def get_survey_changes(self, survey_id: str) -> List[Dict[str, Any]]:
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_id).first()
        if not survey:
            raise NotFoundException(f"Survey {survey_id} not found")

        records = (
            self.db.query(AIChangeResult)
            .filter(AIChangeResult.survey_id == survey.id)
            .all()
        )
        if not records:
            demo = self.detector.detect_historical_changes(survey_id, {})
            return demo["changes"]

        return [
            {
                "change_id": r.change_id,
                "change_type": r.change_type,
                "severity": r.severity.value if hasattr(r.severity, "value") else str(r.severity),
                "old_value": r.old_value,
                "new_value": r.new_value,
                "area_affected_m2": r.area_affected_m2,
                "percentage_change": r.percentage_change,
                "confidence": r.confidence,
                "geometry": r.geometry_geojson,
                "crs": r.crs,
                "historical_dataset_id": r.historical_dataset_id,
                "current_dataset_id": r.current_dataset_id,
                "audit_status": r.audit_status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in records
        ]
