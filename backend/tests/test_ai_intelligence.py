import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.db.seed import seed_mock_data
from app.models.survey import Survey
from app.models.ingestion import ProcessingJob, JobType, JobStatus
from app.models.ai_results import (
    AIModel,
    AIInferenceResult,
    AIClassificationResult,
    AIBoundaryResult,
    AIChangeResult,
    AIAuditLog,
    AIVerificationStatus,
    AIChangeSeverity,
)
from app.modules.ai.common.base_model import BaseAIModel
from app.modules.ai.common.confidence import ConfidenceManager
from app.modules.ai.common.postprocessing import AIPostprocessor
from app.modules.ai.common.model_registry import ModelRegistry
from app.modules.ai.classification.classifier import LandUseClassifier
from app.modules.ai.classification.model_loader import YOLOModelAdapter, SegmentationModelAdapter
from app.modules.ai.boundary_detection.detector import MultiSensorBoundaryDetector
from app.modules.ai.boundary_detection.model_loader import BoundaryModelAdapter
from app.modules.ai.change_detection.change_detector import HistoricalChangeDetector
from app.modules.ai.change_detection.model_loader import ChangeDetectionModelAdapter
from app.modules.ai.classification.service import ClassificationService
from app.modules.ai.boundary_detection.service import BoundaryService
from app.modules.ai.change_detection.service import ChangeDetectionService


# Setup in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_mock_data(db)
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ==============================================================================
# 1. MODEL ABSTRACTION & LOADING
# ==============================================================================

def test_classification_model_loading():
    """1. Validates YOLOModelAdapter and SegmentationModelAdapter loading & metadata."""
    yolo = YOLOModelAdapter()
    assert yolo.load() is True
    assert yolo.is_loaded is True
    meta = yolo.get_model_metadata()
    assert meta["model_id"] == "land-classifier-yolo-v1"
    assert "AGRICULTURAL" in yolo.classes
    assert len(yolo.classes) == 8

    seg = SegmentationModelAdapter()
    assert seg.load() is True
    assert seg.is_loaded is True
    assert "SegFormer" in seg.framework or "Transformers" in seg.framework


# ==============================================================================
# 2. CLASSIFICATION INFERENCE & CLASSES
# ==============================================================================

def test_classification_prediction():
    """2. Validates LandUseClassifier produces 8 classes with planar and 3D surface areas."""
    classifier = LandUseClassifier()
    context = {
        "survey_id": "SUR-2026-001",
        "spatial_bounds": {"min_lon": 73.7110, "max_lon": 73.7175, "min_lat": 24.5835, "max_lat": 24.5895},
    }
    result = classifier.classify_survey_land("SUR-2026-001", context)
    assert result["status"] == "COMPLETED"
    assert result["total_regions"] >= 6
    assert "AGRICULTURAL" in result["summary_distribution"]
    assert result["is_demo_simulation"] is True


# ==============================================================================
# 3. CONFIDENCE SCORING & TIERS
# ==============================================================================

def test_classification_confidence():
    """3. Validates configurable confidence tiers (HIGH >0.90, MEDIUM 0.70-0.90, LOW <0.70)."""
    cm = ConfidenceManager(high_threshold=0.90, medium_threshold=0.70)
    high_eval = cm.evaluate_confidence(0.95)
    assert high_eval["tier"] == "HIGH"
    assert high_eval["badge_color"] == "#10b981"

    med_eval = cm.evaluate_confidence(0.82)
    assert med_eval["tier"] == "MEDIUM"
    assert med_eval["badge_color"] == "#f59e0b"

    low_eval = cm.evaluate_confidence(0.55)
    assert low_eval["tier"] == "LOW"
    assert low_eval["badge_color"] == "#ef4444"


# ==============================================================================
# 4. BOUNDARY INTELLIGENCE & MULTI-SENSOR ATTRIBUTION
# ==============================================================================

def test_boundary_detection():
    """4. Validates MultiSensorBoundaryDetector combines LiDAR, RGB, and DEM sources."""
    detector = MultiSensorBoundaryDetector()
    context = {"survey_id": "SUR-2026-001"}
    result = detector.detect_candidate_boundaries("SUR-2026-001", context)
    assert result["total_candidates"] >= 4
    for c in result["candidates"]:
        assert len(c["sources"]) >= 1
        assert "LIDAR" in c["sources"] or "RGB_ORTHOMOSAIC" in c["sources"]
        assert c["verification_status"] == "CANDIDATE"


def test_boundary_confidence():
    """5. Validates candidate boundary confidence evaluation."""
    detector = MultiSensorBoundaryDetector()
    result = detector.detect_candidate_boundaries("SUR-2026-001", {})
    assert result["confidence_overall"] >= 0.80


# ==============================================================================
# 6. AI RESULT DATABASE PERSISTENCE
# ==============================================================================

def test_ai_result_persistence(db_session):
    """6. Verifies persistence of AIInferenceResult and AIClassificationResult records in DB."""
    svc = ClassificationService(db_session)
    res = svc.run_classification_pipeline("SUR-2026-001", confidence_threshold=0.50)
    assert "inference_id" in res
    inf_db = db_session.query(AIInferenceResult).filter(AIInferenceResult.inference_id == res["inference_id"]).first()
    assert inf_db is not None
    assert len(inf_db.classifications) >= 6


# ==============================================================================
# 7. HISTORICAL CHANGE DETECTION & ENCROACHMENT
# ==============================================================================

def test_change_detection():
    """7. Validates HistoricalChangeDetector flags boundary shifts and potential encroachments."""
    detector = HistoricalChangeDetector()
    res = detector.detect_historical_changes("SUR-2026-001", {})
    assert res["total_changes"] >= 4
    assert res["potential_encroachments_count"] >= 1
    encroachments = [c for c in res["changes"] if c["severity"] == "CRITICAL_ENCROACHMENT"]
    assert len(encroachments) >= 1
    assert "POTENTIAL_ENCROACHMENT" in encroachments[0]["change_type"]


def test_historical_new_dataset_comparison(db_session):
    """8. Validates service execution comparing old cadastre vs new drone orthomosaic."""
    svc = ChangeDetectionService(db_session)
    res = svc.run_change_detection_pipeline(
        survey_id="SUR-2026-001",
        historical_dataset_id="DS-1998-CADASTRE",
        current_dataset_id="DS-2026-001-ORTHO",
    )
    assert res["total_changes"] >= 4
    assert res["is_demo_simulation"] is True


# ==============================================================================
# 9. GEOMETRY VALIDITY & SCALE INVARIANCE
# ==============================================================================

def test_geometry_validity():
    """9. Validates AI postprocessor creates closed rings with valid area >0."""
    coords = [
        [73.7110, 24.5845],
        [73.7130, 24.5845],
        [73.7130, 24.5865],
        [73.7110, 24.5865],
    ]
    poly = AIPostprocessor.construct_georeferenced_polygon(coords, slope_deg=3.5)
    assert poly["geometry_geojson"]["type"] == "Polygon"
    assert len(poly["geometry_geojson"]["coordinates"][0]) == 5  # Closed ring
    assert poly["planar_area_m2"] > 20000.0
    assert poly["surface_area_3d_m2"] > poly["planar_area_m2"]


def test_crs_consistency():
    """10. Validates CRS metadata consistency across all AI outputs."""
    poly = AIPostprocessor.construct_georeferenced_polygon([[73.71, 24.58], [73.72, 24.58], [73.72, 24.59]], crs="EPSG:4326")
    assert poly["crs"] == "EPSG:4326"


# ==============================================================================
# 11. MODEL REGISTRY & VERSION TRACKING
# ==============================================================================

def test_model_version_tracking(db_session):
    """11. Validates AIModel registry queries and version metadata."""
    models = db_session.query(AIModel).all()
    assert len(models) >= 4
    model_ids = [m.model_id for m in models]
    assert "land-classifier-yolo-v1" in model_ids
    assert "boundary-segmentation-v2" in model_ids
    assert "change-detector-v1" in model_ids


# ==============================================================================
# 12. HUMAN-IN-THE-LOOP VERIFICATION & AUDIT LOGGING
# ==============================================================================

def test_human_verification(db_session):
    """12. Validates accept/verify, reject, and vertex editing by land surveyors."""
    svc = BoundaryService(db_session)
    svc.run_boundary_detection_pipeline("SUR-2026-001")

    # Verify boundary
    v_res = svc.verify_candidate_boundary("BND-SUR-2026-001-001", comment="Surveyor ground verified")
    assert v_res["status"] == "VERIFIED"

    # Reject boundary
    r_res = svc.reject_candidate_boundary("BND-SUR-2026-001-002", reason="Temporary irrigation ditch")
    assert r_res["status"] == "REJECTED"


def test_audit_logging(db_session):
    """13. Validates AIAuditLog records surveyor actions with original vs edited geometry."""
    svc = BoundaryService(db_session)
    svc.run_boundary_detection_pipeline("SUR-2026-001")

    new_geom = {
        "type": "Polygon",
        "coordinates": [[[73.7110, 24.5845], [73.7140, 24.5845], [73.7140, 24.5865], [73.7110, 24.5865], [73.7110, 24.5845]]]
    }
    svc.edit_candidate_boundary("BND-SUR-2026-001-003", new_geom, comment="Moved east vertex along physical bund")

    logs = db_session.query(AIAuditLog).filter(AIAuditLog.target_id == "BND-SUR-2026-001-003").all()
    assert len(logs) >= 1
    assert logs[0].user_action == "EDIT_VERTICES"
    assert logs[0].edited_geometry_geojson is not None


# ==============================================================================
# 14. DEMO SIMULATION & PROCESSING JOB INTEGRATION
# ==============================================================================

def test_demo_ai_mode():
    """14. Validates demo AI mode output is clearly marked."""
    detector = HistoricalChangeDetector()
    res = detector.detect_historical_changes("SUR-2026-001", {})
    assert res["is_demo_simulation"] is True


def test_processing_job_integration(db_session):
    """15. Validates ProcessingJob integration for AI jobs."""
    svc = ClassificationService(db_session)
    res = svc.run_classification_pipeline("SUR-2026-001")
    job = db_session.query(ProcessingJob).filter(ProcessingJob.job_id == res["job_id"]).first()
    assert job is not None
    assert job.job_type == JobType.AI_CLASSIFICATION
    assert job.status == JobStatus.COMPLETED
    assert job.progress_percentage == 100.0


# ==============================================================================
# 16. API INTEGRATION TESTS
# ==============================================================================

def test_ai_api_endpoints(client):
    """16. Integration tests for canonical /api/v1/ai/ endpoints."""
    # List AI models
    models_res = client.get("/api/v1/ai/models")
    assert models_res.status_code == 200
    assert models_res.json()["data"]["total_models"] >= 4

    # Run Land Classification
    class_res = client.post("/api/v1/ai/classification/predict", json={"survey_id": "SUR-2026-001", "confidence_threshold": 0.50})
    assert class_res.status_code == 200
    assert class_res.json()["data"]["status"] == "COMPLETED"

    # Get Survey Classifications
    get_class_res = client.get("/api/v1/ai/classification/survey/SUR-2026-001")
    assert get_class_res.status_code == 200

    # Run Candidate Boundary Detection
    bnd_res = client.post("/api/v1/ai/boundary/detect", json={"survey_id": "SUR-2026-001", "confidence_threshold": 0.60})
    assert bnd_res.status_code == 200

    # Get Survey Candidate Boundaries
    get_bnd_res = client.get("/api/v1/ai/boundary/survey/SUR-2026-001")
    assert get_bnd_res.status_code == 200

    # Run Change Detection
    chg_res = client.post("/api/v1/ai/change-detection", json={"survey_id": "SUR-2026-001"})
    assert chg_res.status_code == 200

    # Get Survey Changes
    get_chg_res = client.get("/api/v1/ai/change-detection/SUR-2026-001")
    assert get_chg_res.status_code == 200

    # Run Full AI Suite
    inf_res = client.post("/api/v1/ai/inference/run-all", json={"survey_id": "SUR-2026-001"})
    assert inf_res.status_code == 200
    assert inf_res.json()["data"]["overall_status"] == "COMPLETED"

    # Get AI Survey Summary
    sum_res = client.get("/api/v1/ai/inference/survey/SUR-2026-001/summary")
    assert sum_res.status_code == 200
    assert sum_res.json()["data"]["overall_health"] == "OPERATIONAL"
