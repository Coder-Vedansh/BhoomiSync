import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.survey import Survey
from app.models.ingestion import ProcessingJob, JobType, JobStatus
from app.models.ai_results import (
    AIModel,
    AIInferenceResult,
    AIClassificationResult,
    AIModelType,
)
from app.modules.ai.classification.classifier import LandUseClassifier
from app.core.exceptions import NotFoundException


class ClassificationService:
    """
    Service Layer for Land Classification AI.
    Integrates with ProcessingJob architecture and persists classification polygons in PostgreSQL/PostGIS.
    """

    def __init__(self, db: Session):
        self.db = db
        self.classifier = LandUseClassifier()

    def run_classification_pipeline(
        self,
        survey_id: str,
        dataset_id: Optional[str] = None,
        confidence_threshold: float = 0.50,
    ) -> Dict[str, Any]:
        """
        Executes land classification, creates/updates ProcessingJob, and saves AI results.
        """
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_id).first()
        if not survey:
            raise NotFoundException(f"Survey {survey_id} not found")

        # 1. Register ProcessingJob
        job_id = f"JOB-AI-CLASS-{survey_id}-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:6].upper()}"
        job = ProcessingJob(
            job_id=job_id,
            job_type=JobType.AI_CLASSIFICATION,
            survey_id=survey.id,
            status=JobStatus.PROCESSING,
            progress_percentage=25.0,
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

        # 2. Execute Classification
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
        res = self.classifier.classify_survey_land(
            survey_id=survey_id,
            spatial_context=spatial_context,
            confidence_threshold=confidence_threshold,
        )

        inference_id = f"INF-CLASS-{survey_id}-{uuid.uuid4().hex[:8].upper()}"
        inference_record = AIInferenceResult(
            inference_id=inference_id,
            survey_id=survey.id,
            job_id=job.id,
            model_id=res["model_id"],
            model_version=res["model_version"],
            inference_type=AIModelType.LAND_CLASSIFICATION,
            execution_time_ms=res["execution_time_ms"],
            confidence_overall=res["confidence_overall"],
            summary_metrics_json=res["summary_distribution"],
            parameters_json=job.parameters_json,
            is_demo_simulation=True,
            created_at=datetime.utcnow(),
        )
        self.db.add(inference_record)
        self.db.commit()
        self.db.refresh(inference_record)

        # 3. Save Region Polygons
        for idx, r in enumerate(res["regions"], start=1):
            class_rec = AIClassificationResult(
                result_id=f"RES-CLASS-{survey_id}-{idx:02d}-{uuid.uuid4().hex[:6].upper()}",
                inference_id=inference_record.id,
                survey_id=survey.id,
                class_name=r["class"],
                confidence=r["confidence"],
                area_m2=r["area_m2"],
                area_hectares=r["area_hectares"],
                percentage=r["percentage"],
                geometry_geojson=r["geometry"],
                crs=r.get("crs", "EPSG:4326"),
                source_dataset_id=r.get("source_dataset_id"),
                model_version=res["model_version"],
                created_at=datetime.utcnow(),
            )
            self.db.add(class_rec)

        # 4. Mark Job Completed
        job.status = JobStatus.COMPLETED
        job.progress_percentage = 100.0
        job.result_json = {
            "inference_id": inference_id,
            "total_regions": res["total_regions"],
            "confidence_overall": res["confidence_overall"],
            "summary_distribution": res["summary_distribution"],
        }
        job.completed_at = datetime.utcnow()
        self.db.commit()

        res["inference_id"] = inference_id
        res["job_id"] = job_id
        return res

    def get_survey_classifications(self, survey_id: str) -> List[Dict[str, Any]]:
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_id).first()
        if not survey:
            raise NotFoundException(f"Survey {survey_id} not found")

        records = (
            self.db.query(AIClassificationResult)
            .filter(AIClassificationResult.survey_id == survey.id)
            .all()
        )
        if not records:
            # Fallback to demo prediction
            demo = self.classifier.classify_survey_land(survey_id, {})
            return demo["regions"]

        return [
            {
                "result_id": rec.result_id,
                "class": rec.class_name,
                "confidence": rec.confidence,
                "area_m2": rec.area_m2,
                "area_hectares": rec.area_hectares,
                "percentage": rec.percentage,
                "geometry": rec.geometry_geojson,
                "crs": rec.crs,
                "source_dataset_id": rec.source_dataset_id,
                "model_version": rec.model_version,
            }
            for rec in records
        ]
