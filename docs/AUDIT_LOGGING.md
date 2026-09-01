# BhoomiSync — Audit Logging Architecture (Prompt 6)

## Overview

BhoomiSync implements an immutable, append-only security audit log that records
every security-relevant action taken within the system. The audit log is designed
for regulatory compliance, forensic analysis, and real-time security monitoring.

---

## Data Model

### SecurityAuditLog Table

| Column            | Type         | Description                            |
|-------------------|-------------|----------------------------------------|
| `id`              | Integer (PK) | Auto-increment primary key             |
| `audit_id`        | String(50)   | Unique human-readable ID (AUD-...)     |
| `user_id`         | String(50)   | User who triggered the event           |
| `username_snapshot`| String(100) | Username at time of event              |
| `action`          | String(100)  | Event type (e.g., LOGIN_SUCCESS)       |
| `resource_type`   | String(100)  | Resource category                      |
| `resource_id`     | String(200)  | Specific resource identifier           |
| `result`          | String(20)   | SUCCESS, FAILURE, or DENIED            |
| `ip_address`      | String(50)   | Client IP address                      |
| `user_agent`      | String(500)  | Client user-agent string               |
| `metadata`        | JSON         | Sanitized contextual metadata          |
| `timestamp`       | DateTime     | UTC timestamp of the event             |

---

## Security Service API

```python
from app.modules.auth.audit_service import SecurityAuditService

# Log a security event
SecurityAuditService.log_event(
    db=db_session,
    action="LOGIN_SUCCESS",
    result="SUCCESS",
    user_id="USR-abc123",
    username_snapshot="admin",
    resource_type="authentication",
    ip_address="192.168.1.100",
    user_agent="Mozilla/5.0...",
    metadata={
        "login_method": "password",
        "role": "ADMIN",
        # password fields are auto-redacted
    }
)
```

---

## Secret Sanitization

The `SecurityAuditService` automatically sanitizes metadata before storage.
Any key containing the following substrings is replaced with `***REDACTED***`:

- `password`
- `token`
- `secret`
- `authorization`
- `credential`

This sanitization is applied **recursively** to nested dictionaries.

### Example

**Input metadata:**
```json
{
  "username": "admin",
  "password_hash": "$2b$12$...",
  "access_token": "eyJhbGc...",
  "login_method": "credentials"
}
```

**Stored as:**
```json
{
  "username": "admin",
  "password_hash": "***REDACTED***",
  "access_token": "***REDACTED***",
  "login_method": "credentials"
}
```

---

## Query API

### List Audit Logs (Admin Only)

```
GET /api/v1/auth/audit-logs?action=LOGIN_SUCCESS&result=FAILURE&limit=50
Authorization: Bearer <admin_jwt>
```

### Security Statistics (Admin Only)

```
GET /api/v1/auth/security-stats
Authorization: Bearer <admin_jwt>
```

Returns:
- Total users / active / inactive
- Users by role
- Active sessions count
- Failed logins in last 24 hours
- Suspicious events in last 24 hours
- Total audit log entries

---

## Frontend Security Admin Page

The `SecurityAdminPage` provides a rich UI for audit log inspection:

1. **KPI Dashboard** — Total users, active sessions, locked accounts, audit events
2. **User Directory** — Search, filter, activate/deactivate, unlock, role management
3. **Active Sessions** — Real-time session inspector with instant revocation
4. **Audit Trail** — Filterable, searchable log with expandable JSON metadata drawer
5. **RBAC Matrix** — Visual permission matrix across all canonical roles

---

## Immutability Guarantee

Audit log entries are designed to be **insert-only**:
- No UPDATE operations on the `security_audit_logs` table
- No DELETE operations on audit records
- Each entry has a unique `audit_id` with embedded timestamp
- Metadata is sanitized at write time, not retroactively
