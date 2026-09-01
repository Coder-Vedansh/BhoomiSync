import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.db.seed import seed_mock_data
from app.models.land_records import (
    LandParcel,
    LandOwner,
    ParcelOwnership,
    LandRecord,
    CadastralVersion,
    ParcelChangeRecord,
    ParcelDocument,
    LandRecordImportSession,
    VerificationStatus,
    MatchStatus,
)
from app.modules.land_records.importers import (
    CSVLandRecordImporter,
    JSONLandRecordImporter,
    GeoJSONLandRecordImporter,
    MockGovernmentDatasetImporter,
)
from app.modules.land_records.matching.matcher import ParcelMatchingEngine
from app.modules.land_records.comparison.comparison_engine import ParcelComparisonEngine

# Setup in-memory SQLite for testing with StaticPool
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)



def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    import app.models  # noqa
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_mock_data(db)
    db.close()
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)



@pytest.fixture
def client():
    return TestClient(app)


# ==============================================================================
# 1. Parcel Creation & Database Models Tests
# ==============================================================================

def test_parcel_creation_and_fields():
    db = TestingSessionLocal()
    parcels = db.query(LandParcel).all()
    assert len(parcels) >= 20
    p1 = db.query(LandParcel).filter(LandParcel.parcel_id == "BS-P-001").first()
    assert p1 is not None
    assert p1.survey_number == "101"
    assert p1.village == "Haripura"
    assert p1.official_area_m2 == 12500.0
    assert p1.official_area_hectares == 1.25
    assert p1.land_use == "AGRICULTURAL"
    assert len(p1.ownerships) >= 1
    assert len(p1.cadastral_versions) >= 4
    assert len(p1.documents) >= 3
    db.close()


def test_owner_relationship_and_privacy_masking(client):
    # Public role request -> Name should be masked
    res_pub = client.get("/api/v1/parcels/BS-P-001", headers={"X-User-Role": "PUBLIC"})
    assert res_pub.status_code == 200
    data_pub = res_pub.json()["data"]
    assert "owner_masked_reference" in data_pub
    assert "*" in data_pub["owner_masked_reference"]

    # Surveyor role request -> Full name visible
    res_srv = client.get("/api/v1/parcels/BS-P-001", headers={"X-User-Role": "SURVEYOR"})
    assert res_srv.status_code == 200
    data_srv = res_srv.json()["data"]
    assert data_srv["primary_owner_name"] == "Ramesh Chandra Patel"


# ==============================================================================
# 2. Importers Tests (CSV, JSON, GeoJSON, Mock Government)
# ==============================================================================

def test_csv_importer():
    importer = CSVLandRecordImporter()
    csv_content = (
        "parcel_id,survey_number,subdivision,village,tehsil,district,state,area_value,area_unit,land_use,owner_name,owner_type\n"
        "CSV-P-991,991,1,Haripura,Girwa,Udaipur,Rajasthan,10000,SQ_METER,AGRICULTURAL,Test Owner 1,INDIVIDUAL\n"
        "CSV-P-992,992,2,Haripura,Girwa,Udaipur,Rajasthan,2.5,HECTARE,FALLOW,Test Owner 2,JOINT\n"
    )
    records, errors = importer.parse(csv_content)
    assert len(errors) == 0
    assert len(records) == 2
    assert records[0]["parcel_id"] == "CSV-P-991"
    assert records[0]["official_area_m2"] == 10000.0
    assert records[1]["official_area_m2"] == 25000.0


def test_json_importer():
    importer = JSONLandRecordImporter()
    json_content = json.dumps([
        {
            "parcel_id": "JSON-P-881",
            "survey_number": "881",
            "village": "Haripura",
            "official_area_m2": 15000.0,
            "land_use": "WATER_BODY",
            "cadastral_geometry": {
                "type": "Polygon",
                "coordinates": [[[73.71, 24.58], [73.72, 24.58], [73.72, 24.59], [73.71, 24.59], [73.71, 24.58]]]
            }
        }
    ])
    records, errors = importer.parse(json_content)
    assert len(errors) == 0
    assert len(records) == 1
    assert records[0]["parcel_id"] == "JSON-P-881"
    assert records[0]["official_area_hectares"] == 1.5


def test_geojson_importer():
    importer = GeoJSONLandRecordImporter()
    geojson_content = json.dumps({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "parcel_id": "GEO-P-771",
                    "survey_number": "771",
                    "area": 8500.0,
                    "land_use": "SETTLEMENT"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[73.71, 24.58], [73.72, 24.58], [73.72, 24.59], [73.71, 24.59], [73.71, 24.58]]]
                }
            }
        ]
    })
    records, errors = importer.parse(geojson_content)
    assert len(errors) == 0
    assert len(records) == 1
    assert records[0]["parcel_id"] == "GEO-P-771"
    assert records[0]["land_use"] == "SETTLEMENT"


def test_importer_schema_validation_and_errors():
    importer = CSVLandRecordImporter()
    # Missing required survey_number
    invalid_csv = "parcel_id,area_value\nINV-P-01,5000\n"
    records, errors = importer.parse(invalid_csv)
    assert len(records) == 0
    assert len(errors) == 1
    assert "Missing mandatory field" in errors[0]["error"]


def test_mock_government_dataset_importer():
    importer = MockGovernmentDatasetImporter()
    records, errors = importer.parse()
    assert len(errors) == 0
    assert len(records) == 20
    assert any(r["parcel_id"] == "BS-P-005" for r in records)


# ==============================================================================
# 3. Geospatial Parcel Matching Engine Tests
# ==============================================================================

def test_geospatial_parcel_matching_iou():
    geom1 = {
        "type": "Polygon",
        "coordinates": [[[73.7110, 24.5840], [73.7130, 24.5840], [73.7130, 24.5860], [73.7110, 24.5860], [73.7110, 24.5840]]]
    }
    # Slightly shifted drone polygon (e.g. 95% overlap)
    geom2 = {
        "type": "Polygon",
        "coordinates": [[[73.7110, 24.5840], [73.7130, 24.5840], [73.7130, 24.5859], [73.7110, 24.5859], [73.7110, 24.5840]]]
    }

    match_res = ParcelMatchingEngine.match_parcel(
        official_geometry=geom1,
        drone_geometry=geom2,
        official_survey_no="101",
        detected_survey_no="101",
    )

    assert match_res["match_status"] == MatchStatus.MATCHED
    assert match_res["match_confidence"] >= 0.90
    assert match_res["spatial_overlap_iou"] >= 0.90


def test_parcel_matching_no_match():
    geom1 = {
        "type": "Polygon",
        "coordinates": [[[73.7110, 24.5840], [73.7130, 24.5840], [73.7130, 24.5860], [73.7110, 24.5860], [73.7110, 24.5840]]]
    }
    # Completely disjoint geometry
    geom_far = {
        "type": "Polygon",
        "coordinates": [[[73.7250, 24.5950], [73.7270, 24.5950], [73.7270, 24.5970], [73.7250, 24.5970], [73.7250, 24.5950]]]
    }

    match_res = ParcelMatchingEngine.match_parcel(
        official_geometry=geom1,
        drone_geometry=geom_far,
        official_survey_no="101",
        detected_survey_no="999",
    )

    assert match_res["match_status"] == MatchStatus.NO_MATCH
    assert match_res["spatial_overlap_iou"] == 0.0


# ==============================================================================
# 4. Parcel Comparison Engine Tests
# ==============================================================================

def test_parcel_comparison_engine_units_and_diffs():
    comp = ParcelComparisonEngine.compare_parcel(
        parcel_id="BS-P-001",
        survey_number="101",
        village="Haripura",
        official_area_m2=12500.0,
        drone_area_m2=12385.7,
        historical_area_m2=12500.0,
        verified_area_m2=12385.7,
    )

    assert comp.official_area.sq_meters == 12500.0
    assert comp.official_area.hectares == 1.25
    assert comp.official_area.acres == pytest.approx(3.0888, 0.001)
    assert comp.drone_area.sq_meters == 12385.7
    assert comp.area_difference_m2 == -114.3
    assert comp.percentage_difference == pytest.approx(-0.91, 0.01)
    assert comp.classification_status in ("NO_SIGNIFICANT_CHANGE", "MINOR_DISCREPANCY")


# ==============================================================================
# 5. REST API Endpoints Tests
# ==============================================================================

def test_api_list_parcels_and_filters(client):
    res = client.get("/api/v1/parcels?village=Haripura&limit=10")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["total"] >= 20
    assert len(data["parcels"]) == 10


def test_api_parcel_ownership_sub_resource(client):
    res = client.get("/api/v1/parcels/BS-P-001/ownership")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["parcel_id"] == "BS-P-001"
    assert data["total_owners"] >= 1
    assert data["owners"][0]["name"] == "Ramesh Chandra Patel"


def test_api_parcel_history_timeline(client):
    res = client.get("/api/v1/parcels/BS-P-001/history")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["total_versions"] == 4
    version_numbers = [v["version_number"] for v in data["versions"]]
    assert "1998_CADASTRAL" in version_numbers
    assert "2026_DRONE_RESURVEY" in version_numbers


def test_api_parcel_changes_encroachment(client):
    res = client.get("/api/v1/parcels/BS-P-005/changes")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["total_changes"] >= 1
    assert data["changes"][0]["change_type"] == "POTENTIAL_ENCROACHMENT"
    assert data["changes"][0]["severity"] == "CRITICAL_ENCROACHMENT"


def test_api_parcel_documents(client):
    res = client.get("/api/v1/parcels/BS-P-001/documents")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["total_documents"] >= 3


def test_api_parcel_comparison(client):
    res = client.get("/api/v1/parcels/BS-P-001/comparison")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["parcel_id"] == "BS-P-001"
    assert data["official_area"]["sq_meters"] == 12500.0


def test_api_parcel_matching(client):
    res = client.post("/api/v1/parcels/BS-P-001/match")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["match_result"]["match_status"] in ("MATCHED", "POSSIBLE_MATCH")


def test_api_surveyor_verify_parcel(client):
    payload = {
        "surveyor_comment": "Field boundary confirmed with RTK base ground station.",
        "status": "SURVEYOR_VERIFIED",
        "verified_area_m2": 12385.7
    }
    res = client.post("/api/v1/parcels/BS-P-001/verify", json=payload)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["verification_status"] == "SURVEYOR_VERIFIED"
    assert data["verified_area_m2"] == 12385.7


def test_api_spatial_query_bbox(client):
    res = client.get("/api/v1/parcels/spatial-query?min_lon=73.70&min_lat=24.58&max_lon=73.73&max_lat=24.60&limit=5")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0


def test_api_cadastral_geojson_layer(client):
    res = client.get("/api/v1/cadastral/layer")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 20


def test_api_land_record_import_and_sessions(client):
    csv_payload = {
        "source_name": "Tehsil Girwa CSV Record Batch",
        "source_type": "CSV",
        "raw_content": (
            "parcel_id,survey_number,subdivision,village,tehsil,district,state,area_value,area_unit,land_use,owner_name,owner_type\n"
            "IMP-TEST-001,901,1,Haripura,Girwa,Udaipur,Rajasthan,11000,SQ_METER,AGRICULTURAL,Mohan Lal,INDIVIDUAL\n"
        ),
        "filename": "batch_901.csv",
        "imported_by": "TEHSILDAR_OFFICIAL"
    }
    res_imp = client.post("/api/v1/land-records/import", json=csv_payload)
    assert res_imp.status_code == 201
    imp_data = res_imp.json()["data"]
    assert imp_data["successful_records"] == 1
    session_id = imp_data["session_id"]

    res_list = client.get("/api/v1/land-records/import-sessions")
    assert res_list.status_code == 200
    assert len(res_list.json()["data"]) >= 1

    res_det = client.get(f"/api/v1/land-records/import-sessions/{session_id}")
    assert res_det.status_code == 200
    assert res_det.json()["data"]["session_id"] == session_id
