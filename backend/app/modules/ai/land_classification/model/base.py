from abc import ABC, abstractmethod
from typing import Dict, Any, List


class LandClassifierModel(ABC):
    """
    Abstract Interface for Land Use / Crop Land Classification Models.
    Model-agnostic: Can be backed by Multispectral Semantic Segmentation (U-Net/SegFormer),
    RandomForest on NDVI/SAR time series, or foundation models (Prithvi/SatMAE).
    """

    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """Returns metadata about the architecture, weights version, and classes."""
        pass

    @abstractmethod
    def classify_orthomosaic(
        self,
        orthomosaic_key: str,
        dem_key: str = None,
        classes: List[str] = None
    ) -> Dict[str, Any]:
        """Executes segmentation inference returning pixel classification & class proportions."""
        pass


class StubLandClassifierModel(LandClassifierModel):
    """Prototype stub demonstrating inference interface."""

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "model_id": "LC-SEGFORMER-AGRI-V1",
            "architecture": "SegFormer-B3 / Multispectral Semantic Segmentation",
            "weights": "pretrained_bhoomi_crop_v1.pth",
            "supported_classes": [
                "AGRICULTURAL_CROP",
                "AGRICULTURAL_FALLOW",
                "ORCHARD_PLANTATION",
                "WATER_BODY",
                "RESIDENTIAL_SETTLEMENT",
                "RURAL_ROAD",
                "BARREN_LAND"
            ],
            "input_bands": ["RED", "GREEN", "BLUE", "NIR", "DEM_ELEVATION"],
            "resolution_m": 0.25
        }

    def classify_orthomosaic(
        self,
        orthomosaic_key: str,
        dem_key: str = None,
        classes: List[str] = None
    ) -> Dict[str, Any]:
        return {
            "inference_status": "COMPLETED",
            "class_distribution_percentage": {
                "AGRICULTURAL_CROP": 68.4,
                "AGRICULTURAL_FALLOW": 16.2,
                "ORCHARD_PLANTATION": 8.1,
                "WATER_BODY": 4.3,
                "RESIDENTIAL_SETTLEMENT": 3.0
            },
            "confidence_score": 0.942,
            "raster_mask_key": "ai/land_classification/LC-MASK-SUR-2026-001.tif"
        }
