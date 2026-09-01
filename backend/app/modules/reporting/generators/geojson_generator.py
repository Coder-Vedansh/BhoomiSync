import json
from typing import Dict, Any
from app.modules.reporting.generators.base_generator import BaseReportGenerator


class GeoJSONReportGenerator(BaseReportGenerator):
    """
    Multi-Layer Cadastral GeoJSON Exporter.
    Produces RFC 7946 compliant GeoJSON FeatureCollection containing all boundary layers,
    land classification, change detections, and metadata.
    """

    def __init__(self):
        super().__init__(
            format_name="GEOJSON",
            mime_type="application/geo+json",
            file_extension="geojson",
        )

    def generate(self, snapshot: Dict[str, Any], **kwargs) -> bytes:
        meta = snapshot.get("snapshot_metadata", {})
        parcel_info = snapshot.get("parcel_and_location", {})
        measurements = snapshot.get("geospatial_measurements", {})
        boundary_data = snapshot.get("boundary_analysis", {}).get("geometries", {})
        surveyor_data = snapshot.get("surveyor_verification", {})
        ai_data = snapshot.get("ai_land_classification", {})
        change_data = snapshot.get("change_and_encroachment", {})

        features = []

        # 1. Official Revenue Cadastre Boundary
        if boundary_data.get("official_boundary"):
            features.append({
                "type": "Feature",
                "geometry": boundary_data["official_boundary"],
                "properties": {
                    "layer_name": "official_boundary",
                    "layer_title": "Official Cadastral Record Boundary",
                    "source": "REVENUE_DEPARTMENT_JAMABANDI",
                    "khasra_number": parcel_info.get("khasra_number"),
                    "parcel_id": parcel_info.get("parcel_id"),
                    "area_m2": measurements.get("official_area_m2"),
                    "fill_color": "#1e3a8a",
                    "stroke_color": "#3b82f6",
                    "stroke_width": 2,
                    "stroke_dasharray": "none",
                }
            })

        # 2. Historical Baseline Boundary (2021)
        if boundary_data.get("historical_boundary"):
            features.append({
                "type": "Feature",
                "geometry": boundary_data["historical_boundary"],
                "properties": {
                    "layer_name": "historical_boundary",
                    "layer_title": "Historical 2021 Cadastral Baseline",
                    "source": "HISTORICAL_DRONE_PILOT_2021",
                    "khasra_number": parcel_info.get("khasra_number"),
                    "parcel_id": parcel_info.get("parcel_id"),
                    "area_m2": measurements.get("historical_area_m2"),
                    "fill_color": "#3b0764",
                    "stroke_color": "#a855f7",
                    "stroke_width": 1.5,
                    "stroke_dasharray": "4 2",
                }
            })

        # 3. Drone AI Detected Boundary
        if boundary_data.get("drone_boundary"):
            features.append({
                "type": "Feature",
                "geometry": boundary_data["drone_boundary"],
                "properties": {
                    "layer_name": "drone_boundary",
                    "layer_title": "Drone Photogrammetry & LiDAR Detected Bund",
                    "source": "AI_SEGMENTATION_LIDAR_FUSION",
                    "khasra_number": parcel_info.get("khasra_number"),
                    "parcel_id": parcel_info.get("parcel_id"),
                    "area_m2": measurements.get("planar_area_m2"),
                    "confidence": ai_data.get("confidence_score", 0.95),
                    "fill_color": "#78350f",
                    "stroke_color": "#f59e0b",
                    "stroke_width": 2,
                    "stroke_dasharray": "none",
                }
            })

        # 4. Surveyor Verified Boundary
        if boundary_data.get("verified_boundary"):
            features.append({
                "type": "Feature",
                "geometry": boundary_data["verified_boundary"],
                "properties": {
                    "layer_name": "verified_boundary",
                    "layer_title": "Surveyor Field-Verified Boundary (GCP Corrected)",
                    "source": "SURVEYOR_VERIFIED",
                    "khasra_number": parcel_info.get("khasra_number"),
                    "parcel_id": parcel_info.get("parcel_id"),
                    "area_m2": measurements.get("verified_area_m2"),
                    "surveyor_id": surveyor_data.get("surveyor_id"),
                    "verification_date": surveyor_data.get("verification_date"),
                    "fill_color": "#064e3b",
                    "stroke_color": "#10b981",
                    "stroke_width": 3,
                    "stroke_dasharray": "none",
                }
            })

        # 5. Centroid Point Feature
        if parcel_info.get("centroid_latitude") and parcel_info.get("centroid_longitude"):
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [parcel_info["centroid_longitude"], parcel_info["centroid_latitude"]]
                },
                "properties": {
                    "layer_name": "parcel_centroid",
                    "label": f"Khasra #{parcel_info.get('khasra_number')}",
                    "land_use": parcel_info.get("land_use"),
                    "planar_area_m2": measurements.get("planar_area_m2"),
                    "elevation_msl_m": measurements.get("elevation_min_m"),
                    "point_type": "CENTROID",
                }
            })

        geojson_obj = {
            "type": "FeatureCollection",
            "crs": {
                "type": "name",
                "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
            },
            "properties": {
                "report_number": kwargs.get("report_number", meta.get("report_number")),
                "survey_id": meta.get("survey_code"),
                "parcel_id": parcel_info.get("parcel_id"),
                "village": parcel_info.get("village"),
                "generated_at": meta.get("generated_at"),
                "total_layers": len(features),
            },
            "features": features,
        }

        return json.dumps(geojson_obj, indent=2, default=str).encode("utf-8")
