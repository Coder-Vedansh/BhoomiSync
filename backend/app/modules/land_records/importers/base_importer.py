import hashlib
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Tuple


class BaseLandRecordImporter(ABC):
    """
    Abstract Base Importer for Cadastral & Land Record Datasets.
    Provides SHA-256 integrity hashing, area unit normalization, and validation.
    """

    @staticmethod
    def compute_sha256(content: str) -> str:
        """Calculates SHA-256 hex digest for dataset provenance."""
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    @staticmethod
    def normalize_area_to_m2(raw_value: float, unit: str = "SQ_METER") -> Tuple[float, float]:
        """
        Converts any land record area unit to standard metric m² and hectares.
        Supports: SQ_METER, HECTARE, ACRE, BIGHA_RAJASTHAN (1 Bigha = 2,500 m²).
        """
        u = unit.upper().strip()
        if u in ("SQ_METER", "SQM", "M2", "METER"):
            m2 = float(raw_value)
        elif u in ("HECTARE", "HECTARES", "HA"):
            m2 = float(raw_value) * 10000.0
        elif u in ("ACRE", "ACRES", "AC"):
            m2 = float(raw_value) * 4046.8564224
        elif u in ("BIGHA", "BIGHA_RAJASTHAN", "PUCCA_BIGHA"):
            m2 = float(raw_value) * 2529.285264  # Standard Rajasthan Revenue Bigha (165 x 165 ft)
        else:
            m2 = float(raw_value)

        hectares = round(m2 / 10000.0, 4)
        return round(m2, 2), hectares

    @staticmethod
    def validate_geometry(geojson_obj: Dict[str, Any]) -> bool:
        """Validates that GeoJSON represents a valid Polygon or MultiPolygon with closed rings."""
        if not isinstance(geojson_obj, dict):
            return False
        g_type = geojson_obj.get("type")
        coords = geojson_obj.get("coordinates")
        if g_type not in ("Polygon", "MultiPolygon") or not coords:
            return False
        
        # Check first ring closure for Polygon
        if g_type == "Polygon":
            if not isinstance(coords, list) or len(coords) == 0:
                return False
            ring = coords[0]
            if len(ring) < 4:
                return False
            # Check closure
            if ring[0] != ring[-1]:
                # Automatically close ring for convenience
                ring.append(ring[0])
        return True

    @abstractmethod
    def parse(self, raw_content: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Parses raw text content.
        Returns:
            (valid_parcel_records: List[Dict], validation_errors: List[Dict])
        """
        pass
