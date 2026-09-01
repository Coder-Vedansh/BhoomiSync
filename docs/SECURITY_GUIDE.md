# BhoomiSync — Security Guide (Prompt 6)

## Threat Model

BhoomiSync manages sensitive government land records, ownership data, and cadastral
boundaries. The security architecture is designed to protect against:

1. **Credential theft** — Bcrypt password hashing, no plaintext storage.
2. **Token replay** — Short-lived JWTs (30min), refresh token rotation with family tracking.
3. **Session hijacking** — Per-device sessions, instant revocation capability.
4. **Account enumeration** — Generic authentication error messages.
5. **Brute-force attacks** — Progressive lockout (5 attempts → 15-minute lock).
6. **Privilege escalation** — Server-side permission enforcement on every request.
7. **Audit trail tampering** — Append-only security audit log.

---

## Password Policy

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character (`!@#$%^&*()`)
- Bcrypt with 12 work factor rounds
- Passwords are NEVER logged, returned in API responses, or stored in audit metadata

---

## Token Security

### Access Token
- Algorithm: HS256
- Secret: `JWT_SECRET_KEY` environment variable (min 32 chars in production)
- Expiry: 30 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Contains: user_id, username, email, roles, permissions

### Refresh Token
- 64-character hex random string
- Stored as SHA-256 hash in database (never raw)
- Expiry: 7 days (configurable via `REFRESH_TOKEN_EXPIRE_DAYS`)
- Automatic rotation on each use
- Family-based reuse detection

---

## Account Lockout

| Parameter              | Default Value |
|------------------------|---------------|
| Max failed attempts    | 5             |
| Lockout duration       | 15 minutes    |
| Unlock method          | Automatic (after timeout) or Admin unlock |

When an account is locked:
- Login attempts return a generic "Invalid credentials" message
- A `ACCOUNT_LOCKED` audit event is recorded
- Admin can manually unlock via `PUT /auth/users/{id}/status`

---

## Security Audit Log

Every security-relevant action is recorded in an **immutable**, **append-only** audit log:

### Recorded Events

| Event                           | Trigger                              |
|---------------------------------|--------------------------------------|
| `USER_REGISTERED`               | New account creation                 |
| `LOGIN_SUCCESS`                 | Successful authentication            |
| `LOGIN_FAILED`                  | Failed authentication attempt        |
| `ACCOUNT_LOCKED`                | Lockout threshold reached            |
| `ACCOUNT_UNLOCKED`              | Admin unlock or timeout              |
| `LOGOUT`                        | Session termination                  |
| `LOGOUT_ALL`                    | All sessions terminated              |
| `TOKEN_ROTATED`                 | Refresh token rotation               |
| `TOKEN_REUSE_ATTACK_DETECTED`   | Revoked token reuse attempt          |
| `PASSWORD_CHANGED`              | Password update                      |
| `ROLE_ASSIGNED`                 | Role added to user                   |
| `ROLE_REMOVED`                  | Role removed from user               |
| `USER_STATUS_CHANGED`           | Activation/deactivation              |
| `AUTHORIZATION_DENIED`          | Permission check failure             |
| `PARCEL_VERIFIED`               | Surveyor parcel sign-off             |
| `LAND_RECORD_IMPORTED`          | Batch record import                  |

### Secret Sanitization

All audit metadata is recursively sanitized. Fields containing `password`, `token`,
`secret`, `authorization`, or `credential` are replaced with `***REDACTED***` before
storage.

---

## Production Deployment Checklist

- [ ] Set `JWT_SECRET_KEY` to a cryptographically random 64+ character string
- [ ] Set `ALLOW_DEV_HEADER_AUTH=false` to disable development-mode header auth
- [ ] Use HTTPS for all API traffic
- [ ] Set `ACCESS_TOKEN_EXPIRE_MINUTES=15` for tighter token windows
- [ ] Enable rate limiting on `/auth/login` and `/auth/register`
- [ ] Run database migrations for auth tables
- [ ] Change demo account passwords or disable demo accounts
- [ ] Configure CORS origins to production domains only
- [ ] Enable security audit log export/archival
