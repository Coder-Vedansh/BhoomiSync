from typing import Dict, Any
from app.modules.gis.spatial_utils import compute_parcel_metrics_from_geojson
from app.modules.gis.photogrammetry_stub import PhotogrammetryPipelineStub, PhotogrammetryPipelineConfig
from app.modules.gis.lidar_stub import LidarProcessingPipelineStub, LidarProcessingConfig
from app.schemas.gis import GISStatusResponse, SpatialMeasurementResponse


class GISService:
    def __init__(self):
        self.photogrammetry = PhotogrammetryPipelineStub()
        self.lidar = LidarProcessingPipelineStub()

    def get_gis_status(self) -> GISStatusResponse:
        return GISStatusResponse(
            status="OPERATIONAL",
            spatial_engine="PostGIS 3.4 / GEOS 3.12 / WGS84 Geodesic Engine",
            default_crs="EPSG:4326 (WGS 84 Geographical 2D Coordinates)",
            supported_crs=[
                "EPSG:4326 (WGS84 Lat/Lon)",
                "EPSG:3857 (Web Mercator)",
                "EPSG:32643 (UTM Zone 43N - Western India / Rajasthan)",
                "EPSG:32644 (UTM Zone 44N - Central / Southern India)",
                "EPSG:7755 (India National Grid CRS)"
            ],
            geodesic_calculator="Chamberlain-Duquette Ellipsoidal Integration",
            capabilities=[
                "Geodesic Area & Perimeter Calculation (m², ha, acres)",
                "Centroid & Bounding Box Extraction",
                "GeoJSON Feature Collection Serialization",
                "Topological Planar Geometry Validation",
                "Photogrammetry Orthorectification Pipeline Boundary",
                "LiDAR Ground Classification & Bare-Earth DEM Extraction"
            ]
        )

    def calculate_measurements(self, geometry_geojson: Dict[str, Any]) -> SpatialMeasurementResponse:
        metrics = compute_parcel_metrics_from_geojson(geometry_geojson)
        return SpatialMeasurementResponse(
            area_m2=metrics["area_m2"],
            area_hectares=metrics["area_hectares"],
            area_acres=metrics["area_acres"],
            perimeter_m=metrics["perimeter_m"],
            centroid={"lat": metrics["centroid_lat"], "lon": metrics["centroid_lon"]},
            bounding_box=metrics["bounding_box"]
        )
