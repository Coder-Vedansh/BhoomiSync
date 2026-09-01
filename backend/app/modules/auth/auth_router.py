from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Request, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.response import StandardResponse
from app.models.auth.models import User
from app.modules.auth.auth_service import AuthService
from app.modules.auth.audit_service import SecurityAuditService
from app.modules.auth.permissions import get_permissions_for_roles, Permissions
from app.modules.auth.dependencies import (
    get_current_user,
    require_authenticated_user,
    require_role,
    require_permission,
)
from app.modules.auth.auth_schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse,
    UserDetailResponse,
    ChangePasswordRequest,
    VerifyAccountRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserSessionResponse,
    SecurityAuditLogResponse,
    RoleAssignRequest,
    UserStatusUpdateRequest,
    SecurityStatsResponse,
)

router = APIRouter(tags=["Authentication, Security & RBAC"])


def extract_client_metadata(request: Request) -> Dict[str, Optional[str]]:
    """Extracts client IP address and User-Agent from incoming request."""
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    return {"ip_address": ip, "user_agent": ua}


# ------------------------------------------------------------------------------
# 1. Public Authentication Endpoints
# ------------------------------------------------------------------------------

@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(
    payload: UserRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Registers a new citizen or surveyor account.
    """
    meta = extract_client_metadata(request)
    service = AuthService(db)
    user_resp = service.register_user(
        payload=payload,
        ip_address=meta["ip_address"],
        user_agent=meta["user_agent"],
    )
    return StandardResponse.success_response(
        data=user_resp,
        message="User account registered successfully.",
    )



@router.post("/auth/login")
def login(
    payload: UserLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Authenticates user credentials and returns JWT access & refresh tokens.
    """
    meta = extract_client_metadata(request)
    service = AuthService(db)
    token_resp = service.authenticate_user(
        payload=payload,
        ip_address=meta["ip_address"],
        user_agent=meta["user_agent"],
    )
    return StandardResponse.success_response(
        data=token_resp,
        message="Authentication successful.",
    )


@router.post("/auth/refresh")
def refresh_token(
    payload: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Refreshes access token with token rotation and reuse detection.
    """
    meta = extract_client_metadata(request)
    service = AuthService(db)
    token_resp = service.refresh_access_token(
        raw_refresh_token=payload.refresh_token,
        device_info=payload.device_info,
        ip_address=meta["ip_address"],
        user_agent=meta["user_agent"],
    )
    return StandardResponse.success_response(
        data=token_resp,
        message="Token refreshed successfully.",
    )


@router.post("/auth/logout")
def logout(
    payload: Optional[RefreshTokenRequest] = None,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Logs out the current session and revokes the provided refresh token.
    """
    meta = extract_client_metadata(request) if request else {"ip_address": None, "user_agent": None}
    service = AuthService(db)
    raw_token = payload.refresh_token if payload else None
    service.logout(
        current_user=current_user,
        raw_refresh_token=raw_token,
        ip_address=meta["ip_address"],
    )
    return StandardResponse.success_response(
        data={"user_id": current_user.user_id},
        message="Logged out successfully.",
    )


@router.post("/auth/logout-all")
def logout_all(
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Revokes all refresh tokens and terminates all active sessions for the user.
    """
    meta = extract_client_metadata(request) if request else {"ip_address": None, "user_agent": None}
    service = AuthService(db)
    count = service.logout_all_sessions(current_user=current_user, ip_address=meta["ip_address"])
    return StandardResponse.success_response(
        data={"terminated_sessions": count},
        message="All active user sessions have been terminated.",
    )


@router.get("/auth/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the authenticated user profile, roles, and granular permissions.
    """
    roles_list = [r.name for r in current_user.roles]
    perms_list = get_permissions_for_roles(roles_list)

    data = UserDetailResponse(
        id=current_user.id,
        user_id=current_user.user_id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        phone_reference=current_user.phone_reference,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        last_login=current_user.last_login,
        failed_login_attempts=current_user.failed_login_attempts,
        locked_until=current_user.locked_until,
        roles=roles_list,
        permissions=perms_list,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        active_sessions_count=len(current_user.sessions),
    )
    return StandardResponse.success_response(
        data=data,
        message="User profile retrieved.",
    )


@router.post("/auth/change-password")
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Changes the authenticated user password and invalidates existing sessions.
    """
    meta = extract_client_metadata(request)
    service = AuthService(db)
    service.change_password(
        current_user=current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
        ip_address=meta["ip_address"],
    )
    return StandardResponse.success_response(
        data={"user_id": current_user.user_id},
        message="Password changed successfully. Please log in with your new password.",
    )


@router.post("/auth/verify-account")
def verify_account(
    payload: VerifyAccountRequest,
    db: Session = Depends(get_db),
):
    """
    Development/mock account verification endpoint.
    """
    user = db.query(User).filter(User.user_id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user.is_verified = True
    db.commit()
    return StandardResponse.success_response(
        data={"user_id": user.user_id, "is_verified": True},
        message="Account verified successfully.",
    )


@router.post("/auth/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Mock password reset request endpoint.
    """
    return StandardResponse.success_response(
        data={"email": payload.email},
        message="If an account exists with this email, a password reset link has been dispatched.",
    )


@router.post("/auth/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Mock password reset confirmation endpoint.
    """
    return StandardResponse.success_response(
        data={"email": payload.email},
        message="Password has been reset successfully.",
    )


# ------------------------------------------------------------------------------
# 2. Session Management Endpoints
# ------------------------------------------------------------------------------

@router.get("/auth/sessions")
def get_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists active sessions for the current user (or all sessions if Admin).
    """
    service = AuthService(db)
    user_id = None if current_user.has_role("ADMIN") else current_user.user_id
    sessions = service.get_user_sessions(user_id=user_id)
    return StandardResponse.success_response(
        data={"sessions": sessions, "total": len(sessions)},
        message="Active sessions retrieved.",
    )


@router.delete("/auth/sessions/{session_id}")
def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Terminates a specific active session.
    """
    service = AuthService(db)
    service.revoke_session(session_id=session_id, admin_user=current_user)
    return StandardResponse.success_response(
        data={"session_id": session_id, "is_active": False},
        message="Session revoked successfully.",
    )


# ------------------------------------------------------------------------------
# 3. Admin RBAC & Security Endpoints
# ------------------------------------------------------------------------------

@router.get("/auth/users")
def list_users(
    role: Optional[str] = Query(None, description="Filter by role name"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search_query: Optional[str] = Query(None, description="Search across username, email, name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission(Permissions.USER_READ)),
    db: Session = Depends(get_db),
):
    """
    [Admin / Official] Lists registered users with roles and status.
    """
    service = AuthService(db)
    users, total = service.list_users(
        role_filter=role,
        is_active=is_active,
        search_query=search_query,
        skip=skip,
        limit=limit,
    )
    return StandardResponse.success_response(
        data={"users": users, "total": total, "skip": skip, "limit": limit},
        message="Users list retrieved.",
    )


@router.get("/auth/users/{user_id}")
def get_user_detail(
    user_id: str,
    current_user: User = Depends(require_permission(Permissions.USER_READ)),
    db: Session = Depends(get_db),
):
    """
    [Admin] Retrieves detailed user account profile.
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    roles = [r.name for r in user.roles]
    perms = get_permissions_for_roles(roles)
    active_sess = db.query(UserSession).filter(UserSession.user_id == user.id, UserSession.is_active == True).count()

    data = UserDetailResponse(
        id=user.id,
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        phone_reference=user.phone_reference,
        is_active=user.is_active,
        is_verified=user.is_verified,
        last_login=user.last_login,
        failed_login_attempts=user.failed_login_attempts,
        locked_until=user.locked_until,
        roles=roles,
        permissions=perms,
        created_at=user.created_at,
        updated_at=user.updated_at,
        active_sessions_count=active_sess,
    )
    return StandardResponse.success_response(
        data=data,
        message="User details retrieved.",
    )


@router.put("/auth/users/{user_id}/status")
def update_user_status(
    user_id: str,
    payload: UserStatusUpdateRequest,
    current_user: User = Depends(require_permission(Permissions.USER_UPDATE)),
    db: Session = Depends(get_db),
):
    """
    [Admin] Activates, deactivates, or unlocks a user account.
    """
    service = AuthService(db)
    updated = service.update_user_status(
        target_user_id=user_id,
        is_active=payload.is_active,
        is_verified=payload.is_verified,
        unlock_account=payload.unlock_account,
        admin_user=current_user,
    )
    return StandardResponse.success_response(
        data=updated,
        message="User status updated successfully.",
    )


@router.post("/auth/users/{user_id}/roles")
def assign_role(
    user_id: str,
    payload: RoleAssignRequest,
    current_user: User = Depends(require_permission(Permissions.USER_UPDATE)),
    db: Session = Depends(get_db),
):
    """
    [Admin] Assigns a role to a user.
    """
    service = AuthService(db)
    updated = service.assign_role_to_user(
        target_user_id=user_id,
        role_name=payload.role_name,
        admin_user=current_user,
    )
    return StandardResponse.success_response(
        data=updated,
        message=f"Role '{payload.role_name}' assigned to user.",
    )


@router.delete("/auth/users/{user_id}/roles/{role_name}")
def remove_role(
    user_id: str,
    role_name: str,
    current_user: User = Depends(require_permission(Permissions.USER_UPDATE)),
    db: Session = Depends(get_db),
):
    """
    [Admin] Removes a role from a user.
    """
    service = AuthService(db)
    updated = service.remove_role_from_user(
        target_user_id=user_id,
        role_name=role_name,
        admin_user=current_user,
    )
    return StandardResponse.success_response(
        data=updated,
        message=f"Role '{role_name}' removed from user.",
    )


@router.get("/auth/audit-logs")
def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by audit action"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    result: Optional[str] = Query(None, description="Filter by result (SUCCESS, FAILURE, DENIED)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission(Permissions.AUDIT_READ)),
    db: Session = Depends(get_db),
):
    """
    [Admin / Auditor] Retrieves immutable security audit log entries.
    """
    logs = SecurityAuditService.get_audit_logs(
        db=db,
        action=action,
        resource_type=resource_type,
        result=result,
        skip=skip,
        limit=limit,
    )
    total = SecurityAuditService.count_audit_logs(
        db=db,
        action=action,
        resource_type=resource_type,
        result=result,
    )
    data = [
        SecurityAuditLogResponse(
            id=log.id,
            audit_id=log.audit_id,
            user_id=log.user_id,
            username_snapshot=log.username_snapshot,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            result=log.result,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            metadata=log.metadata_json or {},
            timestamp=log.timestamp,
        )
        for log in logs
    ]
    return StandardResponse.success_response(
        data={"logs": data, "total": total, "skip": skip, "limit": limit},
        message="Audit logs retrieved.",
    )


@router.get("/auth/security-stats")
def get_security_stats(
    current_user: User = Depends(require_permission(Permissions.AUDIT_READ)),
    db: Session = Depends(get_db),
):
    """
    [Admin] Aggregates security metrics and KPIs for the Security Dashboard.
    """
    service = AuthService(db)
    stats = service.get_security_stats()
    return StandardResponse.success_response(
        data=stats,
        message="Security statistics retrieved.",
    )

