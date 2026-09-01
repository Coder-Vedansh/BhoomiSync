import json
from typing import Dict, Any, List, Tuple
from app.modules.land_records.importers.base_importer import BaseLandRecordImporter


class GeoJSONLandRecordImporter(BaseLandRecordImporter):
    """
    Parser for standard GeoJSON FeatureCollection containing parcel features.
    """

    def parse(self, raw_content: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        valid_records = []
        errors = []

        try:
            data = json.loads(raw_content)
            features = data.get("features", []) if data.get("type") == "FeatureCollection" else [data]

            for idx, feat in enumerate(features):
                try:
                    props = feat.get("properties", {})
                    geom = feat.get("geometry", {})
                    
                    parcel_id = props.get("parcel_id") or props.get("khasra_id") or f"GEOJSON-P-{idx+1:03d}"
                    survey_no = props.get("survey_number") or props.get("khasra_no") or str(100 + idx + 1)
                    
                    if not self.validate_geometry(geom):
                        errors.append({
                            "index": idx,
                            "error": f"Invalid polygon geometry in feature index {idx}"
                        })
                        continue

                    raw_area = float(props.get("official_area_m2") or props.get("area") or 10000.0)
                    area_unit = props.get("area_unit") or "SQ_METER"
                    area_m2, area_ha = self.normalize_area_to_m2(raw_area, area_unit)

                    record = {
                        "parcel_id": str(parcel_id).strip(),
                        "survey_number": str(survey_no).strip(),
                        "subdivision_number": str(props.get("subdivision", "1")).strip(),
                        "village": props.get("village", "Haripura").strip(),
                        "tehsil": props.get("tehsil", "Girwa").strip(),
                        "district": props.get("district", "Udaipur").strip(),
                        "state": props.get("state", "Rajasthan").strip(),
                        "official_area_m2": area_m2,
                        "official_area_hectares": area_ha,
                        "cadastral_geometry": geom,
                        "land_use": props.get("land_use", "AGRICULTURAL").strip().upper(),
                        "land_record_source": props.get("source", "GeoJSON Cadastral Import"),
                        "owner_name": props.get("owner_name", "Registered Khatedar").strip(),
                        "owner_type": props.get("owner_type", "INDIVIDUAL").strip().upper(),
                    }
                    valid_records.append(record)

                except Exception as ex:
                    errors.append({"index": idx, "error": f"Feature {idx} error: {str(ex)}"})

        except Exception as ex:
            errors.append({"error": f"GeoJSON parsing failed: {str(ex)}"})

        return valid_records, errors
