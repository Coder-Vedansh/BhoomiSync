from abc import ABC, abstractmethod
from typing import Dict, Any, List


class GeospatialChangeDetectorModel(ABC):
    """
    Abstract Interface for Temporal Geospatial Change Detection Models.
    Model-agnostic: Supports Siamese Convolutional/Vision Transformer diff networks,
    Geometrical Poly-diffing against historical revenue cadastre, or NDVI difference indexing.
    """

    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """Returns change detection architecture and accuracy benchmarks."""
        pass

    @abstractmethod
    def detect_changes(
        self,
        historical_dataset_id: str,
        current_dataset_id: str,
        drift_tolerance_m: float = 0.5
    ) -> Dict[str, Any]:
        """Computes boundary encroachment, subdivision, and land-use transition differences."""
        pass


class StubGeospatialChangeDetectorModel(GeospatialChangeDetectorModel):
    """Prototype stub demonstrating historical vs current change analysis."""

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "model_id": "CD-SIAMESE-GEO-V1",
            "architecture": "Siamese Temporal Vision Transformer + Cadastral Vector Diff Engine",
            "weights": "bhoomi_change_detector_v1.pt",
            "supported_checks": [
                "Boundary Encroachment Detection",
                "Agricultural to Non-Agricultural Land Conversion",
                "Illegal Parcel Subdivision / Road Widening Discrepancies",
                "Water Body / Canal Shrinkage"
            ],
            "spatial_precision_m": 0.15
        }

    def detect_changes(
        self,
        historical_dataset_id: str,
        current_dataset_id: str,
        drift_tolerance_m: float = 0.5
    ) -> Dict[str, Any]:
        return {
            "status": "COMPLETED",
            "comparison_report_id": f"CR-DIFF-{historical_dataset_id[:8]}-{current_dataset_id[:8]}",
            "parcels_evaluated": 5,
            "discrepancies_flagged": 1,
            "encroachment_alert_details": {
                "parcel_id": "PRC-SUR-2026-001-03",
                "boundary_drift_m": 1.42,
                "area_discrepancy_m2": 138.4,
                "notes": "Western boundary shifted 1.4m outwards into village pathway."
            }
        }
