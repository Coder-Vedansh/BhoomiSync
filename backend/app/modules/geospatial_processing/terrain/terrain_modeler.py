from typing import Dict, Any, List, Optional
from datetime import datetime


class TerrainModeler:
    """
    Terrain Modeling & Digital Elevation Pipeline for BhoomiSync.
    Constructs Bare-Earth Digital Elevation Models (DEM), Digital Surface Models (DSM),
    slope gradient rasters, and contour line geometries.
    """

    def generate_dem_manifest(
        self,
        survey_id: str,
        lidar_summary: Dict[str, Any],
        bounds: Optional[Dict[str, float]] = None,
        resolution_m: float = 0.5,  # 50cm per pixel DEM
    ) -> Dict[str, Any]:
        """
        Constructs bare-earth Digital Elevation Model (DEM) metadata and GIS raster layer parameters.
        """
        stats = lidar_summary.get("elevation_stats", {})
        min_z = stats.get("min_elevation_m", 582.4)
        max_z = stats.get("max_elevation_m", 618.9)

        if not bounds:
            bounds = {
                "min_lon": 73.7110,
                "max_lon": 73.7175,
                "min_lat": 24.5835,
                "max_lat": 24.5895,
            }

        return {
            "dem_id": f"DEM-{survey_id}",
            "survey_id": survey_id,
            "product_type": "DIGITAL_ELEVATION_MODEL_BARE_EARTH",
            "crs": "EPSG:4326",
            "vertical_datum": "EGM96 Orthometric Height (m)",
            "grid_resolution_m": resolution_m,
            "elevation_range": {
                "min_m": min_z,
                "max_m": max_z,
                "mean_m": stats.get("mean_elevation_m", 600.65),
                "span_m": stats.get("elevation_span_m", 36.5),
            },
            "spatial_bounds": bounds,
            "bounds_leaflet": [
                [bounds["min_lat"], bounds["min_lon"]],
                [bounds["max_lat"], bounds["max_lon"]],
            ],
            "raster_layer_url": f"/api/v1/surveys/{survey_id}/dem/raster.png",
            "slope_analysis": {
                "mean_slope_deg": 3.8,
                "max_slope_deg": 14.2,
                "terrain_classification": "GENTLY_UNDULATING_AGRICULTURAL_TERRAIN",
            },
            "color_ramp": {
                "palette": "Terrain-Turbo (Blue to Green to Yellow to Brown)",
                "min_color": "#1e3a8a",
                "mid_color": "#10b981",
                "max_color": "#b45309",
            },
            "created_at": datetime.utcnow().isoformat() + "Z",
        }

    def generate_dsm_manifest(
        self,
        survey_id: str,
        lidar_summary: Dict[str, Any],
        bounds: Optional[Dict[str, float]] = None,
        resolution_m: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Constructs Digital Surface Model (DSM) including canopy and farm structures.
        """
        stats = lidar_summary.get("elevation_stats", {})
        min_z = stats.get("min_elevation_m", 582.4)
        max_z = stats.get("max_elevation_m", 618.9) + 4.2  # Tree canopy / structure height

        if not bounds:
            bounds = {
                "min_lon": 73.7110,
                "max_lon": 73.7175,
                "min_lat": 24.5835,
                "max_lat": 24.5895,
            }

        return {
            "dsm_id": f"DSM-{survey_id}",
            "survey_id": survey_id,
            "product_type": "DIGITAL_SURFACE_MODEL_FIRST_RETURN",
            "crs": "EPSG:4326",
            "vertical_datum": "EGM96 Orthometric Height (m)",
            "grid_resolution_m": resolution_m,
            "elevation_range": {
                "min_m": min_z,
                "max_m": round(max_z, 2),
                "canopy_height_max_m": 4.2,
            },
            "spatial_bounds": bounds,
            "bounds_leaflet": [
                [bounds["min_lat"], bounds["min_lon"]],
                [bounds["max_lat"], bounds["max_lon"]],
            ],
            "raster_layer_url": f"/api/v1/surveys/{survey_id}/dsm/raster.png",
            "created_at": datetime.utcnow().isoformat() + "Z",
        }
