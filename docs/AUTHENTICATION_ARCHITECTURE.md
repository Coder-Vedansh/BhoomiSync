# BhoomiSync — Authentication Architecture (Prompt 6)

## Overview

BhoomiSync implements a production-grade, server-side authentication architecture using
JSON Web Tokens (JWT) for stateless access control and cryptographically-hashed refresh
tokens for session continuity. The architecture replaces the development-only `X-User-Role`
header mechanism with authenticated user identities and server-enforced authorization.

---

## Token Architecture

### Access Token (JWT)

| Property        | Value                                    |
|-----------------|------------------------------------------|
| Algorithm       | HS256 (HMAC-SHA256)                      |
| Expiry          | 30 minutes (configurable)                |
| Claims          | `sub` (user_id), `username`, `email`, `roles`, `permissions`, `iat`, `exp` |
| Storage (Client)| `localStorage` key `bhoomi_access_token` |
| Revocation      | Short-lived; expires naturally            |

### Refresh Token

| Property        | Value                                    |
|-----------------|------------------------------------------|
| Format          | 64 hex-character cryptographic random    |
| Stored as       | SHA-256 hash (never raw)                 |
| Expiry          | 7 days (configurable)                    |
| Rotation        | Automatic on each `/auth/refresh` call   |
| Family tracking | `family_id` for reuse-attack detection   |
| Storage (Client)| `localStorage` key `bhoomi_refresh_token`|

### Token Family Reuse Detection

Every refresh token belongs to a **family** (UUID). When a token is used:

1. The server issues a **new** refresh token in the same family.
2. The old token is **revoked**.
3. If a **revoked** token is re-presented, all tokens in the family are invalidated,
   active sessions are terminated, and a `TOKEN_REUSE_ATTACK_DETECTED` audit event is logged.

---

## Password Security

| Property              | Value                              |
|-----------------------|------------------------------------|
| Hashing algorithm     | Bcrypt (12 rounds)                 |
| Password complexity   | Min 8 chars, uppercase, lowercase, digit, special char |
| Storage               | Only bcrypt hash stored (never plaintext) |
| Verification          | Constant-time comparison           |

---

## Login Security

| Property              | Value                              |
|-----------------------|------------------------------------|
| Max failed attempts   | 5 per user                         |
| Lockout duration      | 15 minutes                         |
| Error messages        | Generic (no username/email enumeration) |
| Audit logging         | Every login attempt logged         |

---

## Authentication Flow

```
Client                          Server
  │                               │
  │  POST /auth/login             │
  │  {username_or_email, password}│
  │──────────────────────────────>│
  │                               │── Validate credentials
  │                               │── Check lockout status
  │                               │── Verify bcrypt hash
  │                               │── Generate JWT access token
  │                               │── Generate refresh token
  │                               │── Create UserSession
  │                               │── Log LOGIN_SUCCESS audit event
  │  {access_token, refresh_token}│
  │<──────────────────────────────│
  │                               │
  │  GET /api/v1/parcels          │
  │  Authorization: Bearer <jwt>  │
  │──────────────────────────────>│
  │                               │── Decode & verify JWT
  │                               │── Extract user permissions
  │                               │── Apply RBAC policy
  │  {data: [...]}                │
  │<──────────────────────────────│
```

---

## API Endpoints

All endpoints are under `/api/v1/auth/`:

| Method | Endpoint               | Description                          | Auth Required |
|--------|------------------------|--------------------------------------|---------------|
| POST   | `/register`            | Create new user account              | No            |
| POST   | `/login`               | Authenticate and get tokens          | No            |
| POST   | `/refresh`             | Rotate refresh token                 | No (token)    |
| POST   | `/logout`              | Revoke current session               | Yes           |
| POST   | `/logout-all`          | Revoke all user sessions             | Yes           |
| GET    | `/me`                  | Current user profile                 | Yes           |
| POST   | `/change-password`     | Update password                      | Yes           |
| GET    | `/sessions`            | List active sessions                 | Yes           |
| DELETE | `/sessions/{id}`       | Revoke specific session              | Yes           |
| GET    | `/users`               | List all users (Admin)               | Admin         |
| GET    | `/users/{id}`          | User detail (Admin)                  | Admin         |
| PUT    | `/users/{id}/status`   | Activate/deactivate/unlock (Admin)   | Admin         |
| POST   | `/users/{id}/roles`    | Assign role (Admin)                  | Admin         |
| DELETE | `/users/{id}/roles/{r}`| Remove role (Admin)                  | Admin         |
| GET    | `/audit-logs`          | Query security audit log             | Admin         |
| GET    | `/security-stats`      | Security statistics dashboard        | Admin         |

---

## FastAPI Dependency Injection

```python
# In any router:
from app.modules.auth.dependencies import (
    get_current_user,          # Returns User or raises 401
    require_authenticated_user,# Alias for get_current_user
    require_role,              # Requires specific role(s)
    require_permission,        # Requires specific permission
    require_any_permission,    # Requires any of listed permissions
    require_all_permissions,   # Requires all listed permissions
)
```

---

## Development Mode Compatibility

When `ALLOW_DEV_HEADER_AUTH=true` (default in dev), the system falls back to
the `X-User-Role` header for unauthenticated requests. This allows existing
Prompt 1–5 tests to pass without modification. In production, this must be
set to `false`.
