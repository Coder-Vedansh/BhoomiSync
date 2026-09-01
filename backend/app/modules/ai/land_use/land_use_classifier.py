from typing import Dict, Any, List, Optional
from app.modules.ai.land_use.model_loader import AgriculturalModelAdapter


class DetailedLandUseClassifier:
    """
    Detailed Agricultural Parcel & Crop Detector.
    Extracts farm plots, vegetation health metrics (NDVI), and canopy density.
    """

    def __init__(self, model_adapter: Optional[AgriculturalModelAdapter] = None):
        self.model = model_adapter or AgriculturalModelAdapter()

    def detect_agricultural_plots(
        self,
        survey_id: str,
        spatial_context: Dict[str, Any],
        confidence_threshold: float = 0.60,
    ) -> Dict[str, Any]:
        raw = self.model.predict(spatial_context)
        filtered = [
            p for p in raw.get("plots", []) if p["confidence"] >= confidence_threshold
        ]
        return {
            "survey_id": survey_id,
            "model_id": self.model.model_id,
            "model_version": self.model.version,
            "total_plots": len(filtered),
            "plots": filtered,
            "is_demo_simulation": True,
        }
