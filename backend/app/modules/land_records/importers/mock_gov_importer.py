from typing import Dict, Any, List, Tuple
from app.modules.land_records.importers.base_importer import BaseLandRecordImporter


class MockGovernmentDatasetImporter(BaseLandRecordImporter):
    """
    Generates 20 realistic cadastral parcels for Haripura Village, Udaipur (Rajasthan).
    Provides agricultural, fallow, water, settlement, road, and mixed-use land records
    with normal parcels, boundary shifts, land-use shifts, and potential encroachment flags.
    """

    @classmethod
    def get_mock_parcels(cls) -> List[Dict[str, Any]]:
        # Centered around Haripura pilot coordinates (73.7100 - 73.7200 E, 24.5830 - 24.5900 N)
        parcels = []
        
        # Grid of 20 realistic cadastral parcels
        parcel_definitions = [
            ("BS-P-001", "101", "1", "AGRICULTURAL", "Ramesh Chandra Patel", "INDIVIDUAL", 12500.0, 12385.7, 12500.0, 12385.7, "MATCHED", 0.96, [[73.7110, 24.5840], [73.7130, 24.5840], [73.7130, 24.5860], [73.7110, 24.5860], [73.7110, 24.5840]], "Normal active wheat cultivation. Minor drone measurement variation within 0.5% tolerance."),
            ("BS-P-002", "102", "1", "AGRICULTURAL", "Suresh Kumar Dangi", "INDIVIDUAL", 9800.0, 9750.0, 9800.0, None, "MATCHED", 0.94, [[73.7130, 24.5840], [73.7150, 24.5840], [73.7150, 24.5860], [73.7130, 24.5860], [73.7130, 24.5840]], "Active mustard crop with established ridge bunds."),
            ("BS-P-003", "103", "1", "FALLOW", "Bhawani Singh Rajput", "INDIVIDUAL", 15200.0, 15120.0, 15200.0, None, "MATCHED", 0.93, [[73.7150, 24.5840], [73.7175, 24.5840], [73.7175, 24.5860], [73.7150, 24.5860], [73.7150, 24.5840]], "Seasonal fallow parcel with clearly marked stone boundary pillars."),
            ("BS-P-004", "104", "1", "AGRICULTURAL", "Kishan Lal Meena", "JOINT", 18400.0, 18257.5, 18400.0, None, "MATCHED", 0.91, [[73.7110, 24.5860], [73.7140, 24.5860], [73.7140, 24.5880], [73.7110, 24.5880], [73.7110, 24.5860]], "Joint family agricultural holding (Khasra 104/1)."),
            ("BS-P-005", "104", "2", "AGRICULTURAL", "Mohan Lal Meena", "JOINT", 6500.0, 6357.5, 6500.0, None, "POSSIBLE_MATCH", 0.88, [[73.7128, 24.5852], [73.7138, 24.5852], [73.7138, 24.5860], [73.7128, 24.5860], [73.7128, 24.5852]], "Potential Encroachment Alert: New unauthorized masonry wall detected on western buffer."),
            ("BS-P-006", "105", "1", "WATER_BODY", "Gram Panchayat Haripura", "COMMUNITY_PANCHAYAT", 4200.0, 4200.0, 4200.0, 4200.0, "MATCHED", 0.98, [[73.7140, 24.5875], [73.7160, 24.5875], [73.7160, 24.5895], [73.7140, 24.5895], [73.7140, 24.5875]], "Village community water retention pond (Talab)."),
            ("BS-P-007", "106", "1", "SETTLEMENT", "Haripura Primary School Trust", "TRUST_INSTITUTIONAL", 3800.0, 3810.0, 3800.0, 3800.0, "MATCHED", 0.97, [[73.7160, 24.5875], [73.7175, 24.5875], [73.7175, 24.5895], [73.7160, 24.5895], [73.7160, 24.5875]], "Institutional school ground & staff building."),
            ("BS-P-008", "107", "1", "ROAD", "Public Works Department (PWD)", "GOVERNMENT", 880.0, 880.0, 880.0, 880.0, "MATCHED", 0.99, [[73.7110, 24.5835], [73.7175, 24.5835], [73.7175, 24.5840], [73.7110, 24.5840], [73.7110, 24.5835]], "Paved village access road connecting Girwa highway."),
            ("BS-P-009", "108", "1", "AGRICULTURAL", "Gopal Das Bairagi", "INDIVIDUAL", 11200.0, 11112.0, 11200.0, None, "MATCHED", 0.94, [[73.7175, 24.5840], [73.7195, 24.5840], [73.7195, 24.5860], [73.7175, 24.5860], [73.7175, 24.5840]], "Orchard plantation with drip irrigation lines."),
            ("BS-P-010", "109", "1", "AGRICULTURAL", "Narayan Lal Suthar", "INDIVIDUAL", 8400.0, 8312.0, 8400.0, None, "MATCHED", 0.92, [[73.7145, 24.5858], [73.7165, 24.5858], [73.7165, 24.5875], [73.7145, 24.5875], [73.7145, 24.5858]], "Boundary Shift Flag: Historical 1998 boundary shifted 1.8m westward along earthen bund."),
            ("BS-P-011", "110", "1", "FALLOW", "Devi Lal Garasiya", "INDIVIDUAL", 7500.0, 7500.0, 7500.0, None, "MATCHED", 0.95, [[73.7175, 24.5860], [73.7195, 24.5860], [73.7195, 24.5880], [73.7175, 24.5880], [73.7175, 24.5860]], "Terraced agricultural fallow land."),
            ("BS-P-012", "111", "1", "AGRICULTURAL", "Prakash Chandra Sharma", "INDIVIDUAL", 13600.0, 13450.0, 13600.0, None, "MATCHED", 0.93, [[73.7110, 24.5880], [73.7135, 24.5880], [73.7135, 24.5900], [73.7110, 24.5900], [73.7110, 24.5880]], "High-yielding wheat crop parcel with solar borewell."),
            ("BS-P-013", "112", "1", "AGRICULTURAL", "Jagdish Prasad Kumawat", "INDIVIDUAL", 9200.0, 9200.0, 9200.0, None, "MATCHED", 0.96, [[73.7135, 24.5880], [73.7155, 24.5880], [73.7155, 24.5900], [73.7135, 24.5900], [73.7135, 24.5880]], "Vegetable cultivation plot with micro-sprinklers."),
            ("BS-P-014", "113", "1", "AGRICULTURAL", "Radha Devi Jat", "INDIVIDUAL", 10800.0, 10736.0, 10800.0, None, "MATCHED", 0.91, [[73.7155, 24.5880], [73.7175, 24.5880], [73.7175, 24.5900], [73.7155, 24.5900], [73.7155, 24.5880]], "New Structure Flag: 64m² solar pump control shed constructed in 2025."),
            ("BS-P-015", "114", "1", "VEGETATION", "Forest Department Rajasthan", "GOVERNMENT", 16500.0, 16500.0, 16500.0, 16500.0, "MATCHED", 0.98, [[73.7175, 24.5880], [73.7200, 24.5880], [73.7200, 24.5900], [73.7175, 24.5900], [73.7175, 24.5880]], "Protected social forestry plantation buffer."),
            ("BS-P-016", "115", "1", "AGRICULTURAL", "Chhagan Lal Gurjar", "INDIVIDUAL", 8900.0, 8820.0, 8900.0, None, "MATCHED", 0.94, [[73.7110, 24.5820], [73.7130, 24.5820], [73.7130, 24.5835], [73.7110, 24.5835], [73.7110, 24.5820]], "Barley and gram cultivation parcel."),
            ("BS-P-017", "116", "1", "AGRICULTURAL", "Laxman Singh Rathore", "INDIVIDUAL", 14200.0, 14050.0, 14200.0, None, "MATCHED", 0.92, [[73.7130, 24.5820], [73.7155, 24.5820], [73.7155, 24.5835], [73.7130, 24.5835], [73.7130, 24.5820]], "Active crop parcel with verified boundary stones."),
            ("BS-P-018", "117", "1", "FALLOW", "Manohar Lal Khatik", "INDIVIDUAL", 11500.0, 11380.0, 11500.0, None, "MATCHED", 0.90, [[73.7155, 24.5820], [73.7175, 24.5820], [73.7175, 24.5835], [73.7155, 24.5835], [73.7155, 24.5820]], "Fallow field currently prepared for Kharif sowing."),
            ("BS-P-019", "118", "1", "AGRICULTURAL", "Shanti Lal Ahari", "INDIVIDUAL", 7200.0, 7200.0, 7200.0, None, "NO_MATCH", 0.65, [[73.7175, 24.5820], [73.7195, 24.5820], [73.7195, 24.5835], [73.7175, 24.5835], [73.7175, 24.5820]], "Unmatched Parcel: Recently partitioned field awaiting official revenue mutation update."),
            ("BS-P-020", "119", "1", "SETTLEMENT", "Gram Panchayat Haripura (Abadi)", "COMMUNITY_PANCHAYAT", 5600.0, 5600.0, 5600.0, 5600.0, "MATCHED", 0.97, [[73.7195, 24.5840], [73.7205, 24.5840], [73.7205, 24.5865], [73.7195, 24.5865], [73.7195, 24.5840]], "Village residential Abadi extension zone."),
        ]

        for p_id, s_no, sub_no, l_use, o_name, o_type, o_area, d_area, h_area, v_area, m_stat, m_conf, coords, notes in parcel_definitions:
            parcels.append({
                "parcel_id": p_id,
                "survey_number": s_no,
                "subdivision_number": sub_no,
                "state": "Rajasthan",
                "district": "Udaipur",
                "tehsil": "Girwa",
                "village": "Haripura",
                "land_record_source": "Rajasthan Revenue Department (Apna Khata / Bhunaksha Mock Prototype)",
                "official_area_m2": o_area,
                "official_area_hectares": round(o_area / 10000.0, 4),
                "drone_measured_area_m2": d_area,
                "historical_area_m2": h_area,
                "verified_area_m2": v_area,
                "cadastral_geometry": {"type": "Polygon", "coordinates": [coords]},
                "current_geometry": {"type": "Polygon", "coordinates": [coords]} if d_area else None,
                "verified_geometry": {"type": "Polygon", "coordinates": [coords]} if v_area else None,
                "geometry_source": "REVENUE_CADASTRAL_MAP",
                "land_use": l_use,
                "ai_detected_land_use": l_use if "AGRICULTURAL" in l_use or "FALLOW" in l_use else l_use,
                "classification_confidence": 0.94 if m_stat == "MATCHED" else 0.72,
                "ownership_status": "CLEAR_TITLED" if "COMMUNITY" not in o_type else "COMMUNITY_HELD",
                "record_status": "OFFICIAL",
                "verification_status": "SURVEYOR_VERIFIED" if v_area else "PENDING",
                "match_status": m_stat,
                "match_confidence": m_conf,
                "owner_name": o_name,
                "owner_type": o_type,
                "notes": notes,
            })

        return parcels

    def parse(self, raw_content: str = "") -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        return self.get_mock_parcels(), []
