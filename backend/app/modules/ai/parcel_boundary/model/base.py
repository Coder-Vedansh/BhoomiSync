from abc import ABC, abstractmethod
from typing import Dict, Any, List


class ParcelBoundaryDetectorModel(ABC):
    """
    Abstract Interface for Cadastral Parcel Boundary Detection & Segmentation Models.
    Model-agnostic: Supports Geospatial Edge Detection (Canny/Sobel on DEM+RGB),
    Multitask Boundary Transformer (Segment Anything / SAM-Fine-Tuned), or active contours.
    Does NOT assume YOLO, as parcel extraction is primarily a polygon boundary segmentation problem.
    """

    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """Returns boundary detection model metadata and hyperparameters."""
        pass

    @abstractmethod
    def detect_parcel_boundaries(
        self,
        orthomosaic_key: str,
        dem_key: str = None,
        min_parcel_area_m2: float = 200.0,
        simplification_tolerance_m: float = 0.2
    ) -> Dict[str, Any]:
        """Segments agricultural plot bunds/fences/boundaries into vector polygon geometries."""
        pass


class StubParcelBoundaryDetectorModel(ParcelBoundaryDetectorModel):
    """Prototype stub demonstrating segmentation boundary extraction."""

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "model_id": "PBD-GEO-SEG-V2",
            "architecture": "SAM-Cadastral / Multiscale Ridge & Bund Boundary Extractor",
            "weights": "bhoomi_rural_bund_extractor_v2.pt",
            "detection_capabilities": [
                "Agricultural Field Bunds / Ridge Boundaries",
                "Fenced Perimeters & Hedgerows",
                "Irrigation Canal Dividers",
                "Village Path Demarcations"
            ],
            "spatial_fusion_inputs": ["ORTHOMOSAIC_RGB", "DEM_HILLSHADE", "CANOPY_HEIGHT"],
            "geometric_postprocessing": "Douglas-Peucker & Topological Planar Enforcement"
        }

    def detect_parcel_boundaries(
        self,
        orthomosaic_key: str,
        dem_key: str = None,
        min_parcel_area_m2: float = 200.0,
        simplification_tolerance_m: float = 0.2
    ) -> Dict[str, Any]:
        return {
            "status": "COMPLETED",
            "parcels_detected_count": 5,
            "average_boundary_confidence": 0.965,
            "vector_geojson_key": "ai/parcel_boundary/PARCELS-SUR-2026-001.geojson",
            "topological_errors_detected": 0
        }
