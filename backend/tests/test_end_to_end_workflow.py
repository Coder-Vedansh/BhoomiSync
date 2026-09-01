import pytest
import hashlib
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_complete_end_to_end_cadastral_workflow():
    """
    Comprehensive End-to-End Integration Test for BhoomiSync Prompt 11.
    Tests the complete unified operational lifecycle:
    Survey Creation -> Mission Launch -> Telemetry Ingest -> Cloud R2 Ingestion ->
    11-Stage Processing -> AI Boundary Detection -> Cadastral Reconciliation ->
    Surveyor Verification -> Report Generation -> Official Sign-Off Approval -> Immutable Seal.
    """
    survey_code = "SUR-E2E-2026-999"
    mission_code = "MIS-E2E-HARIPURA-999"

    # 1. System Health Verification
    health_resp = client.get("/api/v1/system/health")
    assert health_resp.status_code == 200
    health_data = health_resp.json()["data"]
    assert health_data["overall_status"] in ("HEALTHY", "SIMULATED")
    assert "backend_api" in health_data["subsystems"]
    assert "cloudflare_r2" in health_data["subsystems"]

    # 2. Step 1: Create Survey Campaign
    survey_payload = {
        "survey_id": survey_code,
        "name": "E2E Operational Revenue Pilot",
        "location": "Haripura Village Sector 9",
        "district": "Udaipur",
        "state": "Rajasthan",
        "center_latitude": 24.5854,
        "center_longitude": 73.7125,
        "total_area_hectares": 125.4,
        "description": "End-to-end automated test campaign",
    }
    create_survey_resp = client.post("/api/v1/surveys", json=survey_payload)
    assert create_survey_resp.status_code == 200

    # 3. Check Initial Lifecycle State (PLANNED)
    lifecycle_resp = client.get(f"/api/v1/surveys/{survey_code}/lifecycle")
    assert lifecycle_resp.status_code == 200
    assert lifecycle_resp.json()["data"]["current_stage"] == "PLANNED"

    # 4. Step 2: Initialize & Launch Drone Flight Mission
    mission_payload = {
        "mission_id": mission_code,
        "mission_name": "Haripura Photogrammetry & LiDAR Flight E2E",
        "survey_id": survey_code,
        "drone_id": "DRONE-001",
        "operator_name": "Lead Pilot Singhal",
        "planned_altitude_m": 120.0,
        "planned_speed_mps": 9.5,
    }
    create_mission_resp = client.post("/api/v1/drone/missions", json=mission_payload)
    assert create_mission_resp.status_code == 201
    active_mission_id = create_mission_resp.json()["mission_id"]

    start_mission_resp = client.post(f"/api/v1/drone/missions/{active_mission_id}/start")
    assert start_mission_resp.status_code == 200
    assert start_mission_resp.json()["status"] == "ACTIVE"

    # Transition Lifecycle to MISSION_ACTIVE
    trans_resp = client.post(
        f"/api/v1/surveys/{survey_code}/lifecycle/transition?target_stage=MISSION_ACTIVE&actor_role=SURVEYOR"
    )
    assert trans_resp.status_code == 200
    assert trans_resp.json()["data"]["current_stage"] == "MISSION_ACTIVE"

    # 5. Step 3: Stream High-Rate RTK Telemetry (10 Hz)
    tel_payload = {
        "mission_id": active_mission_id,
        "timestamp": "2026-09-01T10:00:00Z",
        "latitude": 24.585400,
        "longitude": 73.712500,
        "altitude_msl": 122.5,
        "ground_speed": 9.2,
        "heading_degrees": 90.0,
        "rtk_status": "FIXED_RTK",
        "rtk_accuracy_cm": 1.4,
        "satellite_count": 18,
        "battery_percent": 98.0,
    }
    tel_resp = client.post("/api/v1/drone/telemetry", json=tel_payload)
    assert tel_resp.status_code == 200
    assert tel_resp.json()["rtk_status"] == "FIXED_RTK"

    # 6. Step 4: Edge-to-R2 Presigned Upload & Idempotent Completion
    raw_content = b"Simulated Sony 42MP high-resolution cadastral orthomosaic image payload"
    sha256_hash = hashlib.sha256(raw_content).hexdigest()

    url_req = {
        "mission_id": active_mission_id,
        "survey_id": survey_code,
        "sensor_type": "RGB",
        "filename": "DJI_E2E_0001.JPG",
        "content_type": "image/jpeg",
        "size_bytes": len(raw_content),
    }
    url_resp = client.post("/api/v1/drone/upload-url", json=url_req)
    assert url_resp.status_code == 200
    object_key = url_resp.json()["object_key"]

    complete_req = {
        "mission_id": active_mission_id,
        "sensor_type": "RGB",
        "object_key": object_key,
        "sha256": sha256_hash,
        "size_bytes": len(raw_content),
        "sequence_number": 1,
    }
    complete_resp = client.post("/api/v1/drone/upload-complete", json=complete_req)
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] in ("VERIFIED", "UPLOADED")

    # 7. Step 5: Execute 11-Stage Geospatial Processing Pipeline
    proc_resp = client.post(
        f"/api/v1/surveys/{survey_code}/processing/start",
        json={"survey_id": survey_code, "target_gsd_cm": 1.2, "target_dem_res_m": 0.5},
    )
    assert proc_resp.status_code == 200
    proc_data = proc_resp.json()["data"]
    assert "orthomosaic" in proc_data
    assert "dem" in proc_data

    # 8. Step 6: AI Intelligence LULC & Bund Detection
    ai_resp = client.post(
        "/api/v1/ai/boundary/detect",
        json={"survey_id": survey_code, "confidence_threshold": 0.85},
    )
    assert ai_resp.status_code == 200
    ai_data = ai_resp.json()["data"]
    assert "candidate_count" in ai_data or "boundaries" in ai_data or "job_id" in ai_data

    # 9. Step 7: Land Records & Cadastral Reconciliation
    parcels_resp = client.get("/api/v1/parcels")
    assert parcels_resp.status_code == 200
    parcels_list = parcels_resp.json()["data"]["parcels"]
    assert len(parcels_list) > 0
    test_parcel_id = parcels_list[0]["parcel_id"]

    # 10. Step 8: Human-in-the-Loop Surveyor Boundary Verification
    verify_resp = client.post(
        f"/api/v1/parcels/{test_parcel_id}/verify",
        json={
            "status": "SURVEYOR_VERIFIED",
            "surveyor_comment": "Field boundaries validated against RTK centimeter carrier ground GCPs.",
        },
        headers={"X-User-Role": "SURVEYOR"},
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["data"]["verification_status"] == "SURVEYOR_VERIFIED"

    # 11. Step 9: Report Generation
    created_survey_id = create_survey_resp.json()["data"]["id"]
    report_payload = {
        "survey_id": created_survey_id,
        "parcel_id": test_parcel_id,
        "report_type": "CADASTRAL_SURVEY",
        "title": "Haripura Pilot Comprehensive Dossier E2E",
    }
    create_report_resp = client.post(
        "/api/v1/reports",
        json=report_payload,
        headers={"X-User-Role": "SURVEYOR"},
    )
    assert create_report_resp.status_code == 201
    report_id = create_report_resp.json()["data"]["report_id"]

    generate_resp = client.post(
        f"/api/v1/reports/{report_id}/generate",
        headers={"X-User-Role": "SURVEYOR"},
    )
    assert generate_resp.status_code == 200
    assert generate_resp.json()["data"]["status"] == "GENERATED"

    # 12. Step 10: Official Sign-Off & Approval (Immutable Seal)
    approve_resp = client.post(
        f"/api/v1/reports/{report_id}/approve",
        json={
            "approved_by_name": "Chief Revenue Officer Verma",
            "notes": "All Khasra boundaries validated against PostGIS and RTK telemetry.",
        },
        headers={"X-User-Role": "GOVERNMENT_OFFICIAL"},
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["data"]["status"] == "APPROVED"

    # 13. Step 11: Final Lifecycle Transition & Download Verification
    final_lifecycle = client.post(
        f"/api/v1/surveys/{survey_code}/lifecycle/transition?target_stage=APPROVED&actor_role=SURVEYOR"
    )
    assert final_lifecycle.status_code == 200
    assert final_lifecycle.json()["data"]["current_stage"] == "APPROVED"

    # Verify Multi-format Downloads are available
    pdf_resp = client.get(f"/api/v1/reports/{report_id}/pdf")
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"

    geojson_resp = client.get(f"/api/v1/reports/{report_id}/geojson")
    assert geojson_resp.status_code == 200
    assert "FeatureCollection" in geojson_resp.text
