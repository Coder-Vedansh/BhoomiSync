import time
from typing import Dict, Any, List, Optional
from app.modules.ai.change_detection.model_loader import ChangeDetectionModelAdapter
from app.modules.ai.common.confidence import ConfidenceManager


class HistoricalChangeDetector:
    """
    Historical Cadastre vs Modern Drone Survey Change Detection Engine.
    Detects boundary shifts, land-use evolution, new structures, and potential encroachments.
    """

    def __init__(self, model_adapter: Optional[ChangeDetectionModelAdapter] = None):
        self.model = model_adapter or ChangeDetectionModelAdapter()
        self.confidence_mgr = ConfidenceManager(high_threshold=0.90, medium_threshold=0.70)

    def detect_historical_changes(
        self,
        survey_id: str,
        spatial_context: Dict[str, Any],
        confidence_threshold: float = 0.60,
    ) -> Dict[str, Any]:
        """
        Executes change detection comparison between old survey data and new drone survey data.
        """
        start_t = time.time()
        raw = self.model.predict(spatial_context)
        exec_time_ms = round((time.time() - start_t) * 1000, 2)

        changes = []
        encroachments = 0
        for c in raw.get("changes", []):
            if c["confidence"] >= confidence_threshold:
                c["change_id"] = f"CHG-{survey_id}-{c['change_id'][-3:]}"
                c["historical_dataset_id"] = spatial_context.get("historical_dataset_id", "DS-1998-CADASTRE")
                c["current_dataset_id"] = spatial_context.get("current_dataset_id", f"DS-{survey_id}-ORTHO")
                if "ENCROACHMENT" in c["change_type"] or c["severity"] == "CRITICAL_ENCROACHMENT":
                    encroachments += 1
                changes.append(c)

        return {
            "survey_id": survey_id,
            "model_id": self.model.model_id,
            "model_version": self.model.version,
            "execution_time_ms": exec_time_ms,
            "total_changes": len(changes),
            "potential_encroachments_count": encroachments,
            "changes": changes,
            "is_demo_simulation": True,
        }
