from datetime import datetime
import re


class ReportNumberService:
    """
    Generates standardized official survey report numbering and identifiers.
    """

    @staticmethod
    def generate_report_id(survey_id: int, parcel_id_str: str, version: int = 1) -> str:
        """
        Generates canonical report identifier e.g. RPT-2026-S001-BS-P-001-V1
        """
        clean_parcel = re.sub(r'[^A-Za-z0-9_-]', '', parcel_id_str)
        year = datetime.utcnow().year
        return f"RPT-{year}-S{survey_id:03d}-{clean_parcel}-V{version}"


    @staticmethod
    def generate_official_report_number(
        state: str = "Rajasthan",
        district: str = "Udaipur",
        khasra_no: str = "101",
        version: int = 1,
    ) -> str:
        """
        Generates standardized official government revenue numbering e.g. BHOOMI/RJ/UDP/2026/000101-V1
        """
        state_code = "RJ" if "rajasthan" in state.lower() else state[:2].upper()
        dist_code = "UDP" if "udaipur" in district.lower() else district[:3].upper()
        year = datetime.utcnow().year
        clean_khasra = re.sub(r'[^0-9]', '', khasra_no) or "101"
        return f"BHOOMI/{state_code}/{dist_code}/{year}/{int(clean_khasra):06d}-V{version}"
