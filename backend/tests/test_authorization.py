import pytest
from app.models.auth.models import User, Role
from app.modules.auth.token_service import TokenService
from app.modules.auth.permissions import Permissions, get_permissions_for_roles



def get_token_for_user(client, username, password):
    res = client.post("/api/v1/auth/login", json={"username_or_email": username, "password": password})
    return res.json()["data"]["access_token"]


# ==============================================================================
# RBAC & Permission Tests
# ==============================================================================

def test_admin_access_to_user_management(client):
    admin_token = get_token_for_user(client, "admin@bhoomisync.demo", "AdminPassword@2026")
    res = client.get("/api/v1/auth/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert len(res.json()["data"]["users"]) >= 4


def test_citizen_forbidden_from_admin_endpoints(client):
    citizen_token = get_token_for_user(client, "citizen@bhoomisync.demo", "CitizenPassword@2026")
    res = client.get("/api/v1/auth/users", headers={"Authorization": f"Bearer {citizen_token}"})
    assert res.status_code == 403
    assert "Missing required permission" in res.json()["detail"] or "Access denied" in res.json()["detail"]


def test_surveyor_can_verify_parcel_boundary(client):
    surveyor_token = get_token_for_user(client, "surveyor@bhoomisync.demo", "SurveyorPassword@2026")
    res = client.post(
        "/api/v1/parcels/BS-P-001/verify",
        json={
            "status": "SURVEYOR_VERIFIED",
            "surveyor_comment": "Verified against centimetric drone orthomosaic by lead surveyor.",
            "verified_area_m2": 12385.7,
        },
        headers={"Authorization": f"Bearer {surveyor_token}"},
    )
    assert res.status_code == 200
    assert res.json()["success"] is True


def test_citizen_forbidden_from_parcel_verification(client):
    citizen_token = get_token_for_user(client, "citizen@bhoomisync.demo", "CitizenPassword@2026")
    res = client.post(
        "/api/v1/parcels/BS-P-001/verify",
        json={"status": "SURVEYOR_VERIFIED", "surveyor_comment": "Unauthorized citizen edit."},
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert res.status_code == 403


def test_government_official_can_import_land_records(client):
    official_token = get_token_for_user(client, "official@bhoomisync.demo", "OfficialPassword@2026")
    res = client.post(
        "/api/v1/land-records/import",
        json={
            "source_name": "Tehsil Girwa Official Revision Batch",
            "source_type": "MOCK_GOVERNMENT_DATASET",
            "raw_content": "{}",
            "imported_by": "Sunita Sharma (Tehsildar)",
        },
        headers={"Authorization": f"Bearer {official_token}"},
    )
    assert res.status_code == 201


def test_citizen_forbidden_from_importing_land_records(client):
    citizen_token = get_token_for_user(client, "citizen@bhoomisync.demo", "CitizenPassword@2026")
    res = client.post(
        "/api/v1/land-records/import",
        json={"source_name": "Fake Batch", "source_type": "CSV", "raw_content": "id,area\n1,100"},
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert res.status_code == 403


def test_role_based_privacy_projection_masking(client):
    # 1. Citizen view (Public) -> Owner name must be masked
    citizen_token = get_token_for_user(client, "citizen@bhoomisync.demo", "CitizenPassword@2026")
    res_pub = client.get("/api/v1/parcels/BS-P-001", headers={"Authorization": f"Bearer {citizen_token}"})
    assert res_pub.status_code == 200
    data_pub = res_pub.json()["data"]
    assert "owner_masked_reference" in data_pub
    assert "*" in data_pub["owner_masked_reference"]

    # 2. Surveyor view -> Full operational details visible
    surveyor_token = get_token_for_user(client, "surveyor@bhoomisync.demo", "SurveyorPassword@2026")
    res_surv = client.get("/api/v1/parcels/BS-P-001", headers={"Authorization": f"Bearer {surveyor_token}"})
    assert res_surv.status_code == 200
    data_surv = res_surv.json()["data"]
    assert data_surv["primary_owner_name"] is not None
