import time
from typing import Dict, Any, List, Optional
from app.modules.ai.classification.model_loader import YOLOModelAdapter
from app.modules.ai.common.confidence import ConfidenceManager


class LandUseClassifier:
    """
    Modular Land Classification Engine for BhoomiSync.
    Processes georeferenced orthomosaics & DEM rasters to classify 8 cadastral land categories.
    """

    def __init__(self, model_adapter: Optional[YOLOModelAdapter] = None):
        self.model = model_adapter or YOLOModelAdapter()
        self.confidence_mgr = ConfidenceManager(high_threshold=0.90, medium_threshold=0.70)

    def classify_survey_land(
        self,
        survey_id: str,
        spatial_context: Dict[str, Any],
        confidence_threshold: float = 0.50,
    ) -> Dict[str, Any]:
        """
        Executes land classification over survey orthomosaic spatial context.
        """
        start_t = time.time()
        raw_results = self.model.predict(spatial_context)
        exec_time_ms = round((time.time() - start_t) * 1000, 2)

        # Filter by threshold and evaluate confidence
        filtered_regions = []
        class_dist: Dict[str, float] = {}

        for r in raw_results.get("regions", []):
            if r["confidence"] >= confidence_threshold:
                conf_eval = self.confidence_mgr.evaluate_confidence(r["confidence"])
                r["confidence_tier"] = conf_eval["tier"]
                r["source_dataset_id"] = spatial_context.get("dataset_id", f"DS-{survey_id}-ORTHO")
                filtered_regions.append(r)
                class_dist[r["class"]] = r["percentage"]

        mean_conf = (
            sum(r["confidence"] for r in filtered_regions) / len(filtered_regions)
            if filtered_regions
            else 0.0
        )
        overall_eval = self.confidence_mgr.evaluate_confidence(mean_conf)

        return {
            "survey_id": survey_id,
            "status": "COMPLETED",
            "model_id": self.model.model_id,
            "model_version": self.model.version,
            "execution_time_ms": exec_time_ms,
            "total_regions": len(filtered_regions),
            "confidence_overall": round(mean_conf, 4),
            "confidence_tier": overall_eval["tier"],
            "summary_distribution": class_dist,
            "regions": filtered_regions,
            "is_demo_simulation": True,
        }
