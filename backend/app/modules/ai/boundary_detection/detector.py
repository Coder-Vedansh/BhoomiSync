import time
from typing import Dict, Any, List, Optional
from app.modules.ai.boundary_detection.model_loader import BoundaryModelAdapter
from app.modules.ai.common.confidence import ConfidenceManager


class MultiSensorBoundaryDetector:
    """
    Multi-Sensor Boundary Intelligence Detector for BhoomiSync.
    Fuses LiDAR elevation discontinuities (bund ridges) + RGB color/texture gradients + DEM slope vectors.
    """

    def __init__(self, model_adapter: Optional[BoundaryModelAdapter] = None):
        self.model = model_adapter or BoundaryModelAdapter()
        self.confidence_mgr = ConfidenceManager(high_threshold=0.90, medium_threshold=0.70)

    def detect_candidate_boundaries(
        self,
        survey_id: str,
        spatial_context: Dict[str, Any],
        confidence_threshold: float = 0.60,
    ) -> Dict[str, Any]:
        """
        Executes multi-sensor boundary inference.
        """
        start_t = time.time()
        raw = self.model.predict(spatial_context)
        exec_time_ms = round((time.time() - start_t) * 1000, 2)

        candidates = []
        for c in raw.get("candidates", []):
            if c["confidence"] >= confidence_threshold:
                c["boundary_id"] = f"BND-{survey_id}-{c['boundary_id'][-3:]}"
                conf_eval = self.confidence_mgr.evaluate_confidence(c["confidence"])
                c["confidence_tier"] = conf_eval["tier"]
                candidates.append(c)

        mean_conf = (
            sum(c["confidence"] for c in candidates) / len(candidates)
            if candidates
            else 0.0
        )

        return {
            "survey_id": survey_id,
            "model_id": self.model.model_id,
            "model_version": self.model.version,
            "execution_time_ms": exec_time_ms,
            "total_candidates": len(candidates),
            "confidence_overall": round(mean_conf, 4),
            "candidates": candidates,
            "is_demo_simulation": True,
        }
