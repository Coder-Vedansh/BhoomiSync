import pytest
import hashlib
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db, SessionLocal
from app.models.drone_ingestion.models import (
    Drone,
    DroneMission,
    SensorDataObject,
    TelemetryRecord,
    ProcessingJobStage,
    DroneStatus,
    MissionStatus,
    SensorDataType,
    ObjectStatus,
    JobStageStatus,
)
from app.modules.drone_ingestion.services.ingestion_service import IngestionService
from app.modules.drone_ingestion.services.r2_storage_service import R2StorageService
from app.modules.drone_ingestion.services.checksum_service import ChecksumService
from app.modules.drone_ingestion.services.processing_trigger_service import ProcessingTriggerService
from app.modules.drone_ingestion.services.manifest_service import ManifestService
from app.modules.drone_ingestion.simulator.drone_simulator import DroneSimulator

client = TestClient(app)


def test_drone_registry(db_session: Session):
    """Test drone hardware registration and query."""
    drone = IngestionService.get_or_create_drone(db_session, "DRONE-TEST-01", "DJI M350 RTK Test")
    assert drone.drone_id == "DRONE-TEST-01"
    assert drone.status == DroneStatus.IDLE

    response = client.get("/api/v1/drone/drones")
    assert response.status_code == 200
    data = response.json()
    assert any(d["drone_id"] == "DRONE-TEST-01" for d in data)


def test_mission_lifecycle(db_session: Session):
    """Test mission creation, initial state, 11 stages initialization, start, and stop."""
    create_payload = {
        "drone_id": "DRONE-TEST-01",
        "mission_name": "Unit Test Flight Mission",
        "survey_id": "SUR-2026-001",
    }
    resp = client.post("/api/v1/drone/missions", json=create_payload)
    assert resp.status_code == 201
    mission_data = resp.json()
    mission_id = mission_data["mission_id"]
    assert mission_data["status"] == "INITIALIZED"
    assert len(mission_data["stages"]) == 11

    # Start mission
    start_resp = client.post(f"/api/v1/drone/missions/{mission_id}/start")
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "ACTIVE"

    # Stop mission
    stop_resp = client.post(f"/api/v1/drone/missions/{mission_id}/stop")
    assert stop_resp.status_code == 200
    assert stop_resp.json()["status"] == "COMPLETED"


def test_invalid_mission_state_transitions(db_session: Session):
    """Test that invalid state transitions are rejected."""
    create_payload = {
        "drone_id": "DRONE-TEST-01",
        "mission_name": "State Machine Test",
        "survey_id": "SUR-2026-001",
    }
    resp = client.post("/api/v1/drone/missions", json=create_payload)
    mission_id = resp.json()["mission_id"]

    # Valid: INITIALIZED -> ACTIVE -> COMPLETED
    start_resp = client.post(f"/api/v1/drone/missions/{mission_id}/start")
    assert start_resp.status_code == 200

    stop_resp = client.post(f"/api/v1/drone/missions/{mission_id}/stop")
    assert stop_resp.status_code == 200

    # Invalid: COMPLETED -> ACTIVE should fail with 400
    invalid_start = client.post(f"/api/v1/drone/missions/{mission_id}/start")
    assert invalid_start.status_code == 400



def test_presigned_upload_url_generation(db_session: Session):
    """Test generating presigned upload URLs with deterministic R2 path."""
    create_payload = {
        "drone_id": "DRONE-TEST-01",
        "mission_name": "Presigned URL Test",
        "survey_id": "SUR-2026-001",
    }
    m_resp = client.post("/api/v1/drone/missions", json=create_payload)
    mission_id = m_resp.json()["mission_id"]

    url_payload = {
        "mission_id": mission_id,
        "sensor_type": "RGB",
        "filename": "frame_000100.jpg",
        "content_type": "image/jpeg",
    }
    url_resp = client.post("/api/v1/drone/upload-url", json=url_payload)
    assert url_resp.status_code == 200
    data = url_resp.json()
    assert "upload_url" in data
    assert f"surveys/SUR-2026-001/missions/{mission_id}/raw/rgb/frame_000100.jpg" in data["object_key"]
    assert data["expires_in"] == 900


def test_sensor_extension_validation():
    """Test validation and rejection of unsupported sensor file extensions."""
    # Valid RGB
    is_valid, _ = ChecksumService.validate_sensor_file(SensorDataType.RGB, "frame.jpg", "image/jpeg")
    assert is_valid is True

    # Invalid RGB extension (.exe)
    is_valid, err = ChecksumService.validate_sensor_file(SensorDataType.RGB, "payload.exe", "application/octet-stream")
    assert is_valid is False
    assert "Invalid file extension" in err

    # Valid LiDAR
    is_valid, _ = ChecksumService.validate_sensor_file(SensorDataType.LIDAR, "scan.las", "application/octet-stream")
    assert is_valid is True


def test_upload_completion_and_sha256(db_session: Session):
    """Test upload completion with SHA-256 validation and duplicate rejection."""
    m_resp = client.post("/api/v1/drone/missions", json={
        "drone_id": "DRONE-TEST-01",
        "mission_name": "Upload Complete Test",
        "survey_id": "SUR-2026-001",
    })
    mission_id = m_resp.json()["mission_id"]

    raw_bytes = b"SAMPLE_HIGH_PRECISION_RGB_PAYLOAD_DATA_12345"
    sha256 = hashlib.sha256(raw_bytes).hexdigest()
    object_key = f"surveys/SUR-2026-001/missions/{mission_id}/raw/rgb/frame_000001.jpg"

    comp_payload = {
        "mission_id": mission_id,
        "object_key": object_key,
        "sensor_type": "RGB",
        "size_bytes": len(raw_bytes),
        "sha256": sha256,
        "sequence_number": 1,
    }

    comp_resp = client.post("/api/v1/drone/upload-complete", json=comp_payload)
    assert comp_resp.status_code == 200
    res = comp_resp.json()
    assert res["success"] is True
    assert res["is_duplicate"] is False
    assert res["sha256"] == sha256

    # Duplicate upload attempt (idempotent response)
    dup_resp = client.post("/api/v1/drone/upload-complete", json=comp_payload)
    assert dup_resp.status_code == 200
    dup_res = dup_resp.json()
    assert dup_res["is_duplicate"] is True
    assert dup_res["processing_triggered"] is False


def test_telemetry_ingestion(db_session: Session):
    """Test streaming telemetry, drone coordinates update, and trajectory endpoint."""
    m_resp = client.post("/api/v1/drone/missions", json={
        "drone_id": "DRONE-TEST-01",
        "mission_name": "Telemetry Stream Test",
        "survey_id": "SUR-2026-001",
    })
    mission_id = m_resp.json()["mission_id"]

    tel_payload = {
        "mission_id": mission_id,
        "latitude": 24.585312,
        "longitude": 73.713245,
        "altitude": 120.5,
        "heading": 182.0,
        "pitch": -2.5,
        "roll": 1.1,
        "rtk_status": "FIXED_RTK",
        "satellites": 19,
        "hdop": 0.65,
        "speed": 8.8,
        "battery_percent": 88.5,
        "sequence_number": 101,
    }

    tel_resp = client.post("/api/v1/drone/telemetry", json=tel_payload)
    assert tel_resp.status_code == 200
    t_data = tel_resp.json()
    assert t_data["latitude"] == 24.585312
    assert t_data["rtk_status"] == "FIXED_RTK"

    # Query trajectory
    traj_resp = client.get(f"/api/v1/drone/missions/{mission_id}/telemetry")
    assert traj_resp.status_code == 200
    traj_list = traj_resp.json()
    assert len(traj_list) >= 1
    assert traj_list[0]["sequence_number"] == 101


def test_mission_health_endpoint(db_session: Session):
    """Test real-time mission health, latency, and queue observability endpoint."""
    m_resp = client.post("/api/v1/drone/missions", json={
        "drone_id": "DRONE-TEST-01",
        "mission_name": "Health Metrics Test",
        "survey_id": "SUR-2026-001",
    })
    mission_id = m_resp.json()["mission_id"]

    health_resp = client.get(f"/api/v1/drone/missions/{mission_id}/health")
    assert health_resp.status_code == 200
    health = health_resp.json()
    assert "mission_status" in health
    assert "upload_rate_mbps" in health
    assert "processing_queue" in health
    assert health["processing_queue"] == 11


def test_processing_trigger_and_manifest(db_session: Session):
    """Test synchronous 11-stage processing run and survey manifest compilation."""
    m_resp = client.post("/api/v1/drone/missions", json={
        "drone_id": "DRONE-TEST-01",
        "mission_name": "Manifest & Stages Test",
        "survey_id": "SUR-2026-001",
    })
    mission_id = m_resp.json()["mission_id"]

    result = ProcessingTriggerService.run_pipeline_sync(db_session, mission_id)
    assert result["status"] == "COMPLETED"
    assert result["completed_stages"] == 11

    manifest = ManifestService.generate_and_save_manifest(db_session, mission_id)
    assert manifest["mission_id"] == mission_id
    assert manifest["schema_version"] == "1.0.0"
    assert "spatial_bounds" in manifest


def test_drone_simulator_controls():
    """Test starting, status polling, and stopping the flight simulator."""
    sim = DroneSimulator.get_instance()
    status = sim.get_status()
    assert "is_running" in status

    # Start simulator with fast speed factor
    start_resp = client.post("/api/v1/drone/simulator/start", json={
        "survey_id": "SUR-2026-001",
        "drone_id": "DRONE-001",
        "total_frames": 10,
        "speed_factor": 5.0,
    })
    assert start_resp.status_code == 200
    assert start_resp.json()["is_running"] is True

    # Check status
    st_resp = client.get("/api/v1/drone/simulator/status")
    assert st_resp.status_code == 200
    assert st_resp.json()["is_running"] is True

    # Stop simulator
    stop_resp = client.post("/api/v1/drone/simulator/stop")
    assert stop_resp.status_code == 200
    assert stop_resp.json()["is_running"] is False
