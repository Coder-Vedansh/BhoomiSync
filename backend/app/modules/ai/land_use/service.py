from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.survey import Survey
from app.modules.ai.land_use.land_use_classifier import DetailedLandUseClassifier
from app.core.exceptions import NotFoundException


class LandUseService:
    def __init__(self, db: Session):
        self.db = db
        self.detector = DetailedLandUseClassifier()

    def detect_crops_and_vegetation(
        self,
        survey_id: str,
        dataset_id: str = None,
        confidence_threshold: float = 0.60,
    ) -> Dict[str, Any]:
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_id).first()
        if not survey:
            raise NotFoundException(f"Survey {survey_id} not found")

        return self.detector.detect_agricultural_plots(
            survey_id=survey_id,
            spatial_context={"survey_id": survey_id, "dataset_id": dataset_id},
            confidence_threshold=confidence_threshold,
        )
