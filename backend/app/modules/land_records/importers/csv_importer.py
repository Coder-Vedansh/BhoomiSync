import csv
import io
import json
from typing import Dict, Any, List, Tuple
from app.modules.land_records.importers.base_importer import BaseLandRecordImporter


class CSVLandRecordImporter(BaseLandRecordImporter):
    """
    Parser for CSV-formatted cadastral records.
    Expected Columns:
        parcel_id, survey_number, subdivision, village, tehsil, district, state,
        area_value, area_unit, land_use, owner_name, owner_type, geometry_geojson
    """

    def parse(self, raw_content: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        valid_records = []
        errors = []
        reader = csv.DictReader(io.StringIO(raw_content))

        for row_num, row in enumerate(reader, start=2):
            try:
                parcel_id = row.get("parcel_id") or row.get("khasra_id")
                survey_no = row.get("survey_number") or row.get("khasra_no")
                if not parcel_id or not survey_no:
                    errors.append({
                        "row": row_num,
                        "error": "Missing mandatory field 'parcel_id' or 'survey_number'"
                    })
                    continue

                raw_area = float(row.get("area_value") or row.get("area") or 10000.0)
                area_unit = row.get("area_unit") or "SQ_METER"
                area_m2, area_ha = self.normalize_area_to_m2(raw_area, area_unit)

                # Geometry parsing
                geom_raw = row.get("geometry_geojson") or row.get("geometry")
                if geom_raw:
                    if isinstance(geom_raw, str):
                        geom_obj = json.loads(geom_raw)
                    else:
                        geom_obj = geom_raw
                else:
                    # Fallback standard bounding polygon for prototype
                    geom_obj = {
                        "type": "Polygon",
                        "coordinates": [[
                            [73.7110, 24.5845],
                            [73.7135, 24.5845],
                            [73.7135, 24.5865],
                            [73.7110, 24.5865],
                            [73.7110, 24.5845]
                        ]]
                    }

                if not self.validate_geometry(geom_obj):
                    errors.append({
                        "row": row_num,
                        "error": f"Invalid polygon geometry for parcel {parcel_id}"
                    })
                    continue

                record = {
                    "parcel_id": parcel_id.strip(),
                    "survey_number": survey_no.strip(),
                    "subdivision_number": row.get("subdivision", "1").strip(),
                    "village": row.get("village", "Haripura").strip(),
                    "tehsil": row.get("tehsil", "Girwa").strip(),
                    "district": row.get("district", "Udaipur").strip(),
                    "state": row.get("state", "Rajasthan").strip(),
                    "official_area_m2": area_m2,
                    "official_area_hectares": area_ha,
                    "cadastral_geometry": geom_obj,
                    "land_use": row.get("land_use", "AGRICULTURAL").strip().upper(),
                    "land_record_source": row.get("source", "CSV Import Batch"),
                    "owner_name": row.get("owner_name", "Registered Khatedar").strip(),
                    "owner_type": row.get("owner_type", "INDIVIDUAL").strip().upper(),
                }
                valid_records.append(record)

            except Exception as ex:
                errors.append({
                    "row": row_num,
                    "error": f"Row parsing exception: {str(ex)}"
                })

        return valid_records, errors
