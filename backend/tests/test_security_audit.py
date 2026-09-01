import pytest
from app.models.auth.models import SecurityAuditLog
from app.modules.auth.audit_service import SecurityAuditService



def test_audit_metadata_secret_sanitization():
    raw_meta = {
        "user_id": "USR-001",
        "action": "LOGIN",
        "password": "SuperSecretPassword123!",
        "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
        "refresh_token": "rt_9876543210",
        "nested": {
            "token": "secret_token_value",
            "safe_field": "public_data",
        },
    }
    sanitized = SecurityAuditService.sanitize_metadata(raw_meta)
    
    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["access_token"] == "[REDACTED]"
    assert sanitized["refresh_token"] == "[REDACTED]"
    assert sanitized["nested"]["token"] == "[REDACTED]"
    assert sanitized["nested"]["safe_field"] == "public_data"


def test_audit_events_created_on_login_flow(client, db_session):
    # Perform a login to generate audit logs
    client.post("/api/v1/auth/login", json={
        "username_or_email": "admin@bhoomisync.demo",
        "password": "AdminPassword@2026",
    })

    logs = db_session.query(SecurityAuditLog).filter(SecurityAuditLog.action == "LOGIN_SUCCESS").all()
    assert len(logs) >= 1
    latest_log = logs[-1]
    assert latest_log.result == "SUCCESS"
    assert latest_log.username_snapshot == "admin"


def test_audit_logs_query_api(client):
    admin_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin@bhoomisync.demo",
        "password": "AdminPassword@2026",
    })
    token = admin_login.json()["data"]["access_token"]

    res = client.get("/api/v1/auth/audit-logs", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()["data"]
    assert "logs" in data
    assert len(data["logs"]) > 0


def test_security_stats_api(client):
    admin_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin@bhoomisync.demo",
        "password": "AdminPassword@2026",
    })
    token = admin_login.json()["data"]["access_token"]

    res = client.get("/api/v1/auth/security-stats", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["total_users"] >= 4
    assert data["active_users"] >= 4
    assert "ADMIN" in data["users_by_role"]
    assert data["audit_log_count"] > 0
