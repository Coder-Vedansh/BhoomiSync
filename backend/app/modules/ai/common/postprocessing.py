import math
from typing import Dict, Any, List
from app.modules.geospatial_processing.measurement.measurement_engine import MeasurementEngine


class AIPostprocessor:
    """
    Geospatial Postprocessing & Topological Vectorizer for BhoomiSync AI.
    Transforms raw segmentation masks and prediction tensors into clean,
    georeferenced WGS84 GeoJSON polygons with computed planar and 3D surface areas.
    """

    @staticmethod
    def construct_georeferenced_polygon(
        coordinates: List[List[float]],
        slope_deg: float = 3.5,
        crs: str = "EPSG:4326",
    ) -> Dict[str, Any]:
        """
        Validates closed polygon topology and computes scale-invariant measurements.
        """
        if len(coordinates) < 3:
            raise ValueError("Polygon must contain at least 3 distinct vertices")

        # Ensure ring is closed
        closed = list(coordinates)
        if closed[0] != closed[-1]:
            closed.append(closed[0])

        metrics = MeasurementEngine.compute_comprehensive_parcel_metrics(
            coordinates=closed,
            slope_deg=slope_deg,
        )

        return {
            "geometry_geojson": {
                "type": "Polygon",
                "coordinates": [closed],
            },
            "crs": crs,
            "planar_area_m2": metrics["planar_area"]["square_meters"],
            "planar_area_ha": metrics["planar_area"]["hectares"],
            "surface_area_3d_m2": metrics["surface_area_3d"]["square_meters"],
            "perimeter_m": metrics["perimeter"]["meters"],
            "centroid": metrics["centroid"],
        }
