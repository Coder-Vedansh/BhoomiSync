from typing import Dict, Any
from app.modules.ai.classification.classifier import LandUseClassifier
from app.modules.ai.boundary_detection.detector import MultiSensorBoundaryDetector
from app.modules.ai.change_detection.change_detector import HistoricalChangeDetector


class MultiSensorInferenceEngine:
    """
    Multi-Sensor AI Fusion Orchestrator for BhoomiSync.
    Coordinates parallel execution of classification, boundary intelligence, and historical change detection.
    """

    def __init__(self):
        self.classifier = LandUseClassifier()
        self.boundary_det = MultiSensorBoundaryDetector()
        self.change_det = HistoricalChangeDetector()

    def execute_full_survey_ai_suite(
        self,
        survey_id: str,
        spatial_context: Dict[str, Any],
        confidence_threshold: float = 0.60,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end multi-modal AI intelligence suite.
        """
        class_res = self.classifier.classify_survey_land(survey_id, spatial_context, confidence_threshold)
        bnd_res = self.boundary_det.detect_candidate_boundaries(survey_id, spatial_context, confidence_threshold)
        chg_res = self.change_det.detect_historical_changes(survey_id, spatial_context, confidence_threshold)

        return {
            "survey_id": survey_id,
            "status": "COMPLETED",
            "classification": class_res,
            "boundary_intelligence": bnd_res,
            "change_detection": chg_res,
            "is_demo_simulation": True,
        }
