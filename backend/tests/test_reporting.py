import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.seed import seed_mock_data
from app.main import app
from app.models.survey import Survey
from app.models.parcel import Parcel
from app.models.auth import User
from app.models.reports import (
    SurveyReport,
    ReportStatus,
    ReportType,
    ExportFormat,
    ReportExport,
    ReportAuditLog,
)
from app.modules.reporting.services.report_service import ReportService
from app.modules.reporting.services.snapshot_service import ReportSnapshotService
from app.modules.reporting.services.report_validation_service import ReportValidationService
from app.modules.reporting.schemas.report_schemas import ReportCreatePayload


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    import app.models  # noqa
    Base.metadata.create_all(bind=engine)
    db = TestingSession()
    seed_mock_data(db)
    yield db
    db.close()


def test_create_draft_report(test_db):
    """Verifies report creation and default section initialization."""
    survey = test_db.query(Survey).first()
    admin = test_db.query(User).filter(User.username == "admin").first()

    payload = ReportCreatePayload(
        survey_id=survey.id,
        parcel_id="BS-P-001",
        report_type=ReportType.CADASTRAL_SURVEY,
        title="Test Cadastral Report",
        preferred_unit="m2",
    )
    report = ReportService.create_draft_report(test_db, payload, admin)

    assert report.id is not None
    assert report.status == ReportStatus.DRAFT
    assert report.version == 1
    assert "BS-P-001" in report.report_id
    assert len(report.sections) == 17


def test_report_snapshot_generation_and_immutability(test_db):
    """Verifies snapshot creation and SHA-256 checksum anchoring."""
    survey = test_db.query(Survey).first()
    admin = test_db.query(User).filter(User.username == "admin").first()

    payload = ReportCreatePayload(
        survey_id=survey.id,
        parcel_id="BS-P-001",
    )
    draft = ReportService.create_draft_report(test_db, payload, admin)
    generated = ReportService.generate_report(test_db, draft.report_id, admin)

    assert generated.status == ReportStatus.GENERATED
    assert generated.data_snapshot is not None
    assert generated.snapshot_checksum_sha256 is not None
    assert len(generated.snapshot_checksum_sha256) == 64

    # Verify checksum matches snapshot
    computed_checksum = ReportSnapshotService.calculate_snapshot_checksum(generated.data_snapshot)
    assert generated.snapshot_checksum_sha256 == computed_checksum


def test_report_versioning(test_db):
    """Verifies sequential version numbers when creating multiple reports for same parcel."""
    survey = test_db.query(Survey).first()
    admin = test_db.query(User).filter(User.username == "admin").first()

    payload = ReportCreatePayload(
        survey_id=survey.id,
        parcel_id="BS-P-999",
    )
    r1 = ReportService.create_draft_report(test_db, payload, admin)
    assert r1.version == 1

    r2 = ReportService.create_draft_report(test_db, payload, admin)
    assert r2.version == 2
    assert "V2" in r2.report_id


def test_pdf_report_generation(test_db):
    """Verifies multi-page ReportLab PDF generator produces valid PDF bytes."""
    from app.modules.reporting.generators.pdf_generator import PDFReportGenerator

    survey = test_db.query(Survey).first()
    snapshot = ReportSnapshotService.create_snapshot(test_db, survey.id, "BS-P-001")

    gen = PDFReportGenerator()
    pdf_bytes = gen.generate(snapshot, report_number="BHOOMI/RJ/UDP/2026/000101-V1")

    assert pdf_bytes is not None
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")


def test_geojson_export_generation(test_db):
    """Verifies RFC 7946 GeoJSON FeatureCollection export generation."""
    from app.modules.reporting.generators.geojson_generator import GeoJSONReportGenerator

    survey = test_db.query(Survey).first()
    snapshot = ReportSnapshotService.create_snapshot(test_db, survey.id, "BS-P-001")

    gen = GeoJSONReportGenerator()
    geojson_bytes = gen.generate(snapshot, report_number="BHOOMI/RJ/UDP/2026/000101-V1")

    parsed = json.loads(geojson_bytes.decode("utf-8"))
    assert parsed["type"] == "FeatureCollection"
    assert len(parsed["features"]) >= 3
    layer_names = [f["properties"]["layer_name"] for f in parsed["features"]]
    assert "official_boundary" in layer_names
    assert "drone_boundary" in layer_names


def test_kml_export_generation(test_db):
    """Verifies OpenGIS KML export generation."""
    from app.modules.reporting.generators.kml_generator import KMLReportGenerator

    survey = test_db.query(Survey).first()
    snapshot = ReportSnapshotService.create_snapshot(test_db, survey.id, "BS-P-001")

    gen = KMLReportGenerator()
    kml_bytes = gen.generate(snapshot)
    kml_text = kml_bytes.decode("utf-8")

    assert "<?xml version=" in kml_text
    assert "<kml xmlns=" in kml_text
    assert "<Document>" in kml_text
    assert "Official Revenue Cadastre" in kml_text
    assert "Drone AI Detected Boundary" in kml_text


def test_csv_export_generation(test_db):
    """Verifies tabular measurement CSV export generation."""
    from app.modules.reporting.generators.csv_generator import CSVReportGenerator

    survey = test_db.query(Survey).first()
    snapshot = ReportSnapshotService.create_snapshot(test_db, survey.id, "BS-P-001")

    gen = CSVReportGenerator()
    csv_bytes = gen.generate(snapshot, report_number="BHOOMI/RJ/UDP/2026/000101-V1")
    csv_text = csv_bytes.decode("utf-8")

    lines = csv_text.strip().split("\r\n")
    if len(lines) == 1:
        lines = csv_text.strip().split("\n")

    assert len(lines) == 2
    assert "khasra_number" in lines[0]
    assert "official_area_m2" in lines[0]
    assert "drone_planar_area_m2" in lines[0]


def test_json_export_generation(test_db):
    """Verifies structured machine-readable JSON export."""
    from app.modules.reporting.generators.json_generator import JSONReportGenerator

    survey = test_db.query(Survey).first()
    snapshot = ReportSnapshotService.create_snapshot(test_db, survey.id, "BS-P-001")

    gen = JSONReportGenerator()
    json_bytes = gen.generate(snapshot, report_number="BHOOMI/RJ/UDP/2026/000101-V1", checksum_sha256="abc123")
    parsed = json.loads(json_bytes.decode("utf-8"))

    assert "report_header" in parsed
    assert "data_provenance_and_integrity" in parsed
    assert "geospatial_measurements" in parsed
    assert "ai_land_classification" in parsed
    assert "legal_and_operational_disclaimers" in parsed


def test_rbac_privacy_masking_in_snapshot(test_db):
    """Verifies Public / Citizen role masks landowner PII while Surveyor/Admin receives full info."""
    survey = test_db.query(Survey).first()

    # 1. Public Role Snapshot
    public_snapshot = ReportSnapshotService.create_snapshot(
        test_db, survey.id, "BS-P-001", user_role="PUBLIC"
    )
    owners_public = public_snapshot["ownership_records"]["owners"]
    assert len(owners_public) > 0
    assert "*" in owners_public[0]["owner_name"]
    assert owners_public[0]["contact_number"] == "[PROTECTED]"
    assert owners_public[0]["id_number"] == "[PROTECTED]"

    # 2. Surveyor Role Snapshot
    surveyor_snapshot = ReportSnapshotService.create_snapshot(
        test_db, survey.id, "BS-P-001", user_role="SURVEYOR"
    )
    owners_surveyor = surveyor_snapshot["ownership_records"]["owners"]
    assert len(owners_surveyor) > 0
    assert "*" not in owners_surveyor[0]["owner_name"]


def test_validation_service_checks(test_db):
    """Verifies quality validation checks parcel, geometry, RTK quality, and returns score."""
    survey = test_db.query(Survey).first()

    res = ReportValidationService.validate_pre_generation(test_db, survey.id, "BS-P-001")
    assert res.is_valid is True
    assert res.parcel_found is True
    assert res.survey_found is True
    assert res.quality_score > 0.70

    # Non-existent parcel
    bad_res = ReportValidationService.validate_pre_generation(test_db, survey.id, "NON_EXISTENT")
    assert bad_res.is_valid is False
    assert len(bad_res.errors) > 0


def test_report_review_and_approval_workflow(test_db):
    """Verifies full lifecycle transitions: DRAFT -> GENERATED -> UNDER_REVIEW -> APPROVED."""
    survey = test_db.query(Survey).first()
    admin = test_db.query(User).filter(User.username == "admin").first()
    surveyor = test_db.query(User).filter(User.username == "surveyor").first()

    payload = ReportCreatePayload(
        survey_id=survey.id,
        parcel_id="BS-P-001",
    )
    report = ReportService.create_draft_report(test_db, payload, surveyor)
    assert report.status == ReportStatus.DRAFT

    report = ReportService.generate_report(test_db, report.report_id, surveyor)
    assert report.status == ReportStatus.GENERATED

    report = ReportService.submit_for_review(test_db, report.report_id, "Ready for approval", surveyor)
    assert report.status == ReportStatus.UNDER_REVIEW
    assert report.submitted_at is not None

    report = ReportService.approve_report(test_db, report.report_id, "Tehsildar Girwa", "Approved", admin)
    assert report.status == ReportStatus.APPROVED
    assert report.approved_by == "Tehsildar Girwa"
    assert report.approved_at is not None


def test_report_rejection_and_archival(test_db):
    """Verifies rejection and archival lifecycle actions."""
    survey = test_db.query(Survey).first()
    admin = test_db.query(User).filter(User.username == "admin").first()
    surveyor = test_db.query(User).filter(User.username == "surveyor").first()

    payload = ReportCreatePayload(
        survey_id=survey.id,
        parcel_id="BS-P-002",
    )
    report = ReportService.create_draft_report(test_db, payload, surveyor)
    report = ReportService.generate_report(test_db, report.report_id, surveyor)
    report = ReportService.submit_for_review(test_db, report.report_id, "Review please", surveyor)

    # Rejection
    report = ReportService.reject_report(test_db, report.report_id, "Boundary GCP shift > 20cm", admin)
    assert report.status == ReportStatus.REJECTED
    assert report.rejection_reason == "Boundary GCP shift > 20cm"

    # Archival
    report = ReportService.archive_report(test_db, report.report_id, admin)
    assert report.status == ReportStatus.ARCHIVED
    assert report.archived_at is not None


def test_audit_logging_on_report_actions(test_db):
    """Verifies audit entries are created across report lifecycle."""
    survey = test_db.query(Survey).first()
    admin = test_db.query(User).filter(User.username == "admin").first()

    payload = ReportCreatePayload(
        survey_id=survey.id,
        parcel_id="BS-P-001",
    )
    report = ReportService.create_draft_report(test_db, payload, admin)
    report = ReportService.generate_report(test_db, report.report_id, admin)

    audit_logs = test_db.query(ReportAuditLog).filter(ReportAuditLog.report_id == report.id).all()
    actions = [a.action for a in audit_logs]

    assert "REPORT_CREATED" in actions
    assert "REPORT_GENERATED" in actions


def test_export_tracking_records(test_db):
    """Verifies ReportExport records are tracked in DB for all 5 formats."""
    survey = test_db.query(Survey).first()
    admin = test_db.query(User).filter(User.username == "admin").first()

    payload = ReportCreatePayload(
        survey_id=survey.id,
        parcel_id="BS-P-001",
    )
    draft = ReportService.create_draft_report(test_db, payload, admin)
    generated = ReportService.generate_report(test_db, draft.report_id, admin)

    exports = test_db.query(ReportExport).filter(ReportExport.report_id == generated.id).all()
    assert len(exports) == 5
    formats = [e.file_format.value for e in exports]
    assert "PDF" in formats
    assert "GEOJSON" in formats
    assert "KML" in formats
    assert "CSV" in formats
    assert "JSON" in formats


def test_api_list_and_get_reports(client):
    """Verifies /api/v1/reports list and get endpoints."""
    headers = {"X-User-Role": "ADMIN"}
    
    # Generate demo report first if none exist
    client.post("/api/v1/reports/demo", headers=headers)

    # List reports
    res = client.get("/api/v1/reports", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) >= 1

    rep_id = data[0]["report_id"]
    res_detail = client.get(f"/api/v1/reports/{rep_id}", headers=headers)
    assert res_detail.status_code == 200
    detail = res_detail.json()["data"]
    assert detail["report_id"] == rep_id
    assert "data_snapshot" in detail
    assert len(detail["sections"]) == 17


def test_api_download_export_endpoints(client):
    """Verifies download endpoints for PDF, GeoJSON, KML, CSV, JSON."""
    headers = {"X-User-Role": "ADMIN"}
    client.post("/api/v1/reports/demo", headers=headers)
    
    res_list = client.get("/api/v1/reports", headers=headers)
    assert res_list.status_code == 200
    rep_id = res_list.json()["data"][0]["report_id"]

    # 1. PDF
    res_pdf = client.get(f"/api/v1/reports/{rep_id}/pdf", headers=headers)
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert res_pdf.content.startswith(b"%PDF")

    # 2. GeoJSON
    res_geo = client.get(f"/api/v1/reports/{rep_id}/geojson", headers=headers)
    assert res_geo.status_code == 200
    geo_json = res_geo.json()
    assert geo_json["type"] == "FeatureCollection"

    # 3. KML
    res_kml = client.get(f"/api/v1/reports/{rep_id}/kml", headers=headers)
    assert res_kml.status_code == 200
    assert "<kml" in res_kml.text

    # 4. CSV
    res_csv = client.get(f"/api/v1/reports/{rep_id}/csv", headers=headers)
    assert res_csv.status_code == 200
    assert "khasra_number" in res_csv.text

    # 5. JSON
    res_json = client.get(f"/api/v1/reports/{rep_id}/json", headers=headers)
    assert res_json.status_code == 200
    assert "report_header" in res_json.json()


def test_api_demo_report_endpoint(client):
    """Verifies 1-click Quick Demo Report generator endpoint."""
    headers = {"X-User-Role": "ADMIN"}
    res = client.post("/api/v1/reports/demo", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["status"] in ["GENERATED", "APPROVED"]
    assert data["data_snapshot"] is not None
    assert len(data["exports"]) == 5

