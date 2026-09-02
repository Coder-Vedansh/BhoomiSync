import time
from typing import Dict, Any, List, Optional
from app.modules.ai.boundary_detection.model_loader import BoundaryModelAdapter
from app.modules.ai.common.confidence import ConfidenceManager
from app.modules.ai.services.huggingface_service import hf_inference_service


class MultiSensorBoundaryDetector:
    """
    Multi-Sensor Boundary Intelligence Detector for BhoomiSync.
    Supports Hugging Face Serverless Inference API (Meta SAM ViT),
    fusing elevation slope gradients and aerial RGB imagery.
    """

    def __init__(self, model_adapter: Optional[BoundaryModelAdapter] = None):
        self.model = model_adapter or BoundaryModelAdapter()
        self.confidence_mgr = ConfidenceManager(high_threshold=0.90, medium_threshold=0.70)
        self.hf_service = hf_inference_service

    def detect_candidate_boundaries(
        self,
        survey_id: str,
        spatial_context: Dict[str, Any],
        confidence_threshold: float = 0.60,
    ) -> Dict[str, Any]:
        """
        Executes boundary inference via Hugging Face Cloud Inference API (or fallback).
        """
        start_t = time.time()
        bounds = spatial_context.get("spatial_bounds", {})

        # If Hugging Face is configured or called, invoke HF SAM Service
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
            "provider": "HUGGINGFACE_LIVE" if self.hf_service.is_configured else "HUGGINGFACE_SERVERLESS",
            "model_id": self.hf_service.sam_model,
            "model_version": "facebook/sam-vit-base",
            "execution_time_ms": exec_time_ms,
            "total_candidates": len(candidates),
            "confidence_overall": round(mean_conf, 4),
            "candidates": candidates,
            "is_demo_simulation": not self.hf_service.is_configured,
        }

