import csv
import io
from typing import Dict, Any
from app.modules.reporting.generators.base_generator import BaseReportGenerator


class CSVReportGenerator(BaseReportGenerator):
    """
    Tabular Measurement & Geospatial Metrics CSV Exporter.
    Generates structured CSV rows suitable for government revenue databases, Excel, and GIS tabular joins.
    """

    def __init__(self):
        super().__init__(
            format_name="CSV",
            mime_type="text/csv",
            file_extension="csv",
        )

    def generate(self, snapshot: Dict[str, Any], **kwargs) -> bytes:
        meta = snapshot.get("snapshot_metadata", {})
        parcel_info = snapshot.get("parcel_and_location", {})
        measurements = snapshot.get("geospatial_measurements", {})
        sensors = snapshot.get("drone_survey_and_sensors", {})
        ai_data = snapshot.get("ai_land_classification", {})
        boundary_data = snapshot.get("boundary_analysis", {})
        change_data = snapshot.get("change_and_encroachment", {})
        surveyor_data = snapshot.get("surveyor_verification", {})

        b_metrics = boundary_data.get("comparison_metrics", {})
        enc = change_data.get("encroachment_assessment", {})

        headers = [
            "report_number",
            "survey_id",
            "parcel_id",
            "khasra_number",
            "village",
            "tehsil",
            "district",
            "state",
            "centroid_latitude",
            "centroid_longitude",
            "official_area_m2",
            "historical_area_m2",
            "drone_planar_area_m2",
            "drone_surface_area_m2",
            "verified_area_m2",
            "perimeter_m",
            "mean_slope_degrees",
            "elevation_min_m",
            "elevation_max_m",
            "primary_land_use",
            "ai_confidence_pct",
            "rtk_fix_quality",
            "avg_horizontal_accuracy_cm",
            "boundary_iou_score",
            "max_displacement_m",
            "potential_encroachment_detected",
            "surveyor_name",
            "surveyor_verification_status",
            "generation_timestamp",
        ]

        row = [
            kwargs.get("report_number", meta.get("report_number")),
            meta.get("survey_code"),
            parcel_info.get("parcel_id"),
            parcel_info.get("khasra_number"),
            parcel_info.get("village"),
            parcel_info.get("tehsil"),
            parcel_info.get("district"),
            parcel_info.get("state"),
            f"{parcel_info.get('centroid_latitude', 0.0):.6f}",
            f"{parcel_info.get('centroid_longitude', 0.0):.6f}",
            f"{measurements.get('official_area_m2', 0.0):.2f}",
            f"{measurements.get('historical_area_m2', 0.0):.2f}",
            f"{measurements.get('planar_area_m2', 0.0):.2f}",
            f"{measurements.get('surface_area_m2', 0.0):.2f}",
            f"{measurements.get('verified_area_m2', 0.0):.2f}",
            f"{measurements.get('perimeter_m', 0.0):.2f}",
            f"{measurements.get('mean_slope_degrees', 0.0):.2f}",
            f"{measurements.get('elevation_min_m', 0.0):.2f}",
            f"{measurements.get('elevation_max_m', 0.0):.2f}",
            parcel_info.get("land_use"),
            f"{ai_data.get('confidence_score', 0.0) * 100:.1f}",
            sensors.get("rtk_gnss_fix"),
            f"{sensors.get('avg_horizontal_accuracy_cm', 0.0):.1f}",
            f"{b_metrics.get('iou_score', 0.0):.3f}",
            f"{b_metrics.get('max_displacement_m', 0.0):.2f}",
            "YES" if enc.get("detected") else "NO",
            surveyor_data.get("surveyor_name"),
            surveyor_data.get("verification_status"),
            meta.get("generated_at"),
        ]

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(headers)
        writer.writerow(row)

        return buffer.getvalue().encode("utf-8")
