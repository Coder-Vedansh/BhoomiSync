import json
from typing import Dict, Any
from app.modules.reporting.generators.base_generator import BaseReportGenerator


class JSONReportGenerator(BaseReportGenerator):
    """
    Machine-Readable Structured JSON Report Exporter.
    Provides standard JSON document with explicit classification of RAW, AI, SYSTEM,
    OFFICIAL, and VERIFIED data for government integration, APIs, and analytics.
    """

    def __init__(self):
        super().__init__(
            format_name="JSON",
            mime_type="application/json",
            file_extension="json",
        )

    def generate(self, snapshot: Dict[str, Any], **kwargs) -> bytes:
        meta = snapshot.get("snapshot_metadata", {})
        parcel_info = snapshot.get("parcel_and_location", {})
        owners_info = snapshot.get("ownership_records", {})
        measurements = snapshot.get("geospatial_measurements", {})
        sensors = snapshot.get("drone_survey_and_sensors", {})
        ai_data = snapshot.get("ai_land_classification", {})
        boundary_data = snapshot.get("boundary_analysis", {})
        change_data = snapshot.get("change_and_encroachment", {})
        surveyor_data = snapshot.get("surveyor_verification", {})
        disclaimers = snapshot.get("disclaimers", {})

        structured_doc = {
            "report_header": {
                "report_number": kwargs.get("report_number", meta.get("report_number")),
                "survey_id": meta.get("survey_code"),
                "survey_title": meta.get("survey_title"),
                "parcel_id": parcel_info.get("parcel_id"),
                "khasra_number": parcel_info.get("khasra_number"),
                "generated_at": meta.get("generated_at"),
                "schema_version": "1.0.0",
                "crs": meta.get("crs"),
                "preferred_unit": meta.get("preferred_unit", "m2"),
                "access_role_level": meta.get("data_access_role", "SURVEYOR"),
            },
            "data_provenance_and_integrity": {
                "checksum_sha256": kwargs.get("checksum_sha256", "UNANCHORED"),
                "data_source_breakdown": {
                    "raw_sensors": "CAMERA_RGB_LIDAR_RTK_GNSS",
                    "ai_models": "BHOOMI_SEG_V2_DEEP_RESNET",
                    "system_calculations": "WGS84_GEODESIC_CHAMBERLAIN_DUQUETTE",
                    "official_records": "RAJASTHAN_REVENUE_JAMABANDI",
                    "surveyor_sign_off": surveyor_data.get("verification_status"),
                }
            },
            "parcel_attributes": parcel_info,
            "ownership_title": owners_info,
            "geospatial_measurements": measurements,
            "drone_survey_telemetry": sensors,
            "ai_land_classification": ai_data,
            "boundary_intelligence": boundary_data,
            "historical_changes_and_encroachments": change_data,
            "surveyor_verification": surveyor_data,
            "legal_and_operational_disclaimers": disclaimers,
        }

        return json.dumps(structured_doc, indent=2, default=str).encode("utf-8")
