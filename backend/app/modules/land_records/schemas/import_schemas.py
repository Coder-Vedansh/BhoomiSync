from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel


class LandRecordImportRequest(BaseModel):
    source_name: str
    source_type: str = "CSV"  # CSV, JSON, GEOJSON, MOCK_GOV
    raw_content: Optional[str] = None  # CSV string, JSON string, or GeoJSON string
    filename: Optional[str] = None
    imported_by: str = "SURVEYOR_OFFICIAL"


class ImportSessionResponse(BaseModel):
    id: int
    session_id: str
    source_name: str
    source_type: str
    filename: Optional[str] = None
    checksum: Optional[str] = None
    total_records: int
    successful_records: int
    failed_records: int
    duplicate_records: int
    status: str
    imported_by: str
    created_at: datetime
    completed_at: Optional[datetime] = None


class ImportSessionDetailResponse(ImportSessionResponse):
    validation_errors_json: List[Dict[str, Any]] = []
