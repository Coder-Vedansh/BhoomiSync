import json
from typing import Dict, Any, List, Tuple
from app.modules.land_records.importers.base_importer import BaseLandRecordImporter


class JSONLandRecordImporter(BaseLandRecordImporter):
    """
    Parser for JSON array of cadastral parcel records.
    """

    def parse(self, raw_content: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        valid_records = []
        errors = []

        try:
            data = json.loads(raw_content)
            if not isinstance(data, list):
                if isinstance(data, dict) and "parcels" in data:
                    data = data["parcels"]
                else:
                    return [], [{"error": "Root JSON must be a list of parcels or object with 'parcels' key"}]

            for idx, item in enumerate(data):
                try:
                    parcel_id = item.get("parcel_id") or item.get("khasra_id")
                    survey_no = item.get("survey_number") or item.get("khasra_no")
                    if not parcel_id or not survey_no:
                        errors.append({
                            "index": idx,
                            "error": "Missing mandatory field 'parcel_id' or 'survey_number'"
                        })
                        continue

                    raw_area = float(item.get("official_area_m2") or item.get("area_value") or 10000.0)
                    area_unit = item.get("area_unit") or "SQ_METER"
                    area_m2, area_ha = self.normalize_area_to_m2(raw_area, area_unit)

                    geom_obj = item.get("cadastral_geometry") or item.get("geometry")
                    if not geom_obj or not self.validate_geometry(geom_obj):
                        errors.append({
                            "index": idx,
                            "error": f"Invalid polygon geometry for parcel {parcel_id}"
                        })
                        continue

                    record = {
                        "parcel_id": str(parcel_id).strip(),
                        "survey_number": str(survey_no).strip(),
                        "subdivision_number": str(item.get("subdivision_number", "1")).strip(),
                        "village": item.get("village", "Haripura").strip(),
                        "tehsil": item.get("tehsil", "Girwa").strip(),
                        "district": item.get("district", "Udaipur").strip(),
                        "state": item.get("state", "Rajasthan").strip(),
                        "official_area_m2": area_m2,
                        "official_area_hectares": area_ha,
                        "cadastral_geometry": geom_obj,
                        "land_use": item.get("land_use", "AGRICULTURAL").strip().upper(),
                        "land_record_source": item.get("source", "JSON Import Batch"),
                        "owner_name": item.get("owner_name", "Registered Khatedar").strip(),
                        "owner_type": item.get("owner_type", "INDIVIDUAL").strip().upper(),
                    }
                    valid_records.append(record)

                except Exception as ex:
                    errors.append({"index": idx, "error": f"Item parsing error: {str(ex)}"})

        except Exception as ex:
            errors.append({"error": f"JSON parsing failed: {str(ex)}"})

        return valid_records, errors
