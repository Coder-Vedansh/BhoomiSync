import pytest
from datetime import datetime, timedelta

from app.models.auth.models import User, Role, RefreshToken, UserSession
from app.modules.auth.password_service import PasswordService
from app.modules.auth.token_service import TokenService
from app.core.config import settings



# ==============================================================================
# Password Service Tests
# ==============================================================================

def test_password_hashing_and_verification():
    raw = "SecureSecret@2026"
    hashed = PasswordService.hash_password(raw)
    
    assert hashed != raw
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert PasswordService.verify_password(raw, hashed) is True
    assert PasswordService.verify_password("WrongPassword@123", hashed) is False


def test_password_strength_validation():
    # Weak passwords
    assert PasswordService.validate_password_strength("short")[0] is False
    assert PasswordService.validate_password_strength("nouppercase1@")[0] is False
    assert PasswordService.validate_password_strength("NOLOWERCASE1@")[0] is False
    assert PasswordService.validate_password_strength("NoDigitsHere@")[0] is False
    assert PasswordService.validate_password_strength("NoSpecialChar123")[0] is False
    
    # Strong password
    assert PasswordService.validate_password_strength("ComplexPass@2026")[0] is True


# ==============================================================================
# Token Service Tests
# ==============================================================================

def test_jwt_access_token_lifecycle():
    token = TokenService.create_access_token(
        user_id="USR-TEST-001",
        username="testuser",
        email="testuser@example.com",
        roles=["SURVEYOR"],
        permissions=["parcel.verify", "survey.read"],
    )
    assert token is not None
    
    payload = TokenService.decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "USR-TEST-001"
    assert payload["username"] == "testuser"
    assert "SURVEYOR" in payload["roles"]
    assert "parcel.verify" in payload["permissions"]


def test_expired_jwt_token_rejection():
    # Token that expired 10 minutes ago
    token = TokenService.create_access_token(
        user_id="USR-EXP-001",
        username="expireduser",
        email="expired@example.com",
        roles=["PUBLIC"],
        permissions=[],
        expires_delta=timedelta(minutes=-10),
    )
    payload = TokenService.decode_access_token(token)
    assert payload is None


def test_refresh_token_hashing():
    raw = TokenService.generate_refresh_token_string()
    h1 = TokenService.hash_refresh_token(raw)
    h2 = TokenService.hash_refresh_token(raw)
    
    assert len(raw) >= 48
    assert len(h1) == 64  # SHA-256 hex length
    assert h1 == h2


# ==============================================================================
# Authentication REST API Tests
# ==============================================================================

def test_user_registration_success(client):
    payload = {
        "username": "new_surveyor_101",
        "email": "surveyor101@bhoomisync.demo",
        "password": "StrongPassword@2026",
        "full_name": "Rohan Sharma",
        "role": "SURVEYOR",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["username"] == "new_surveyor_101"
    assert data["email"] == "surveyor101@bhoomisync.demo"
    assert "SURVEYOR" in data["roles"]


def test_user_registration_duplicate_rejection(client):
    payload = {
        "username": "dup_user",
        "email": "dup@bhoomisync.demo",
        "password": "StrongPassword@2026",
        "full_name": "Duplicate User",
    }
    r1 = client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201

    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409


def test_login_success(client):
    login_data = {
        "username_or_email": "admin@bhoomisync.demo",
        "password": "AdminPassword@2026",
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["username"] == "admin"
    assert "ADMIN" in data["roles"]


def test_login_failure_generic_error(client):
    # Non-existent user
    r1 = client.post("/api/v1/auth/login", json={"username_or_email": "nonexistent@fake.com", "password": "AnyPassword@123"})
    assert r1.status_code == 401
    assert "Invalid username/email or password" in r1.json()["detail"]

    # Wrong password for existing user
    r2 = client.post("/api/v1/auth/login", json={"username_or_email": "admin@bhoomisync.demo", "password": "WrongPassword@999"})
    assert r2.status_code == 401
    assert "Invalid username/email or password" in r2.json()["detail"]


def test_account_lockout_after_failed_attempts(client, db_session):
    # Register an isolated user for lockout testing
    client.post("/api/v1/auth/register", json={
        "username": "lockout_target",
        "email": "lockout@bhoomisync.demo",
        "password": "TargetPassword@2026",
        "full_name": "Lockout Target",
    })

    # Fail login 5 times
    for _ in range(5):
        client.post("/api/v1/auth/login", json={
            "username_or_email": "lockout_target",
            "password": "WrongPassword@123",
        })

    # 6th attempt should return 423 Locked
    response = client.post("/api/v1/auth/login", json={
        "username_or_email": "lockout_target",
        "password": "TargetPassword@2026",
    })
    assert response.status_code == 423
    assert "temporarily locked" in response.json()["detail"]


def test_token_refresh_and_rotation(client):
    # 1. Login to get tokens
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "surveyor@bhoomisync.demo",
        "password": "SurveyorPassword@2026",
    })
    tokens = res.json()["data"]
    old_refresh = tokens["refresh_token"]

    # 2. Refresh token
    ref_res = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert ref_res.status_code == 200
    new_tokens = ref_res.json()["data"]
    assert "access_token" in new_tokens
    assert new_tokens["refresh_token"] != old_refresh

    # 3. Old refresh token is now revoked; replaying it should trigger token reuse protection
    reuse_res = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert reuse_res.status_code == 401
    assert "Revoked refresh token reuse detected" in reuse_res.json()["detail"]


def test_get_current_user_profile(client):
    login_res = client.post("/api/v1/auth/login", json={
        "username_or_email": "official@bhoomisync.demo",
        "password": "OfficialPassword@2026",
    })
    token = login_res.json()["data"]["access_token"]

    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    data = me_res.json()["data"]
    assert data["username"] == "official"
    assert "GOVERNMENT_OFFICIAL" in data["roles"]
    assert "land_record.import" in data["permissions"]


def test_logout_and_logout_all(client):
    login_res = client.post("/api/v1/auth/login", json={
        "username_or_email": "citizen@bhoomisync.demo",
        "password": "CitizenPassword@2026",
    })
    token = login_res.json()["data"]["access_token"]
    refresh = login_res.json()["data"]["refresh_token"]

    # Logout
    logout_res = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_res.status_code == 200

    # Logout all
    logout_all_res = client.post(
        "/api/v1/auth/logout-all",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_all_res.status_code == 200
