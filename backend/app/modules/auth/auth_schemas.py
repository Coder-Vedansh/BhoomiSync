from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=150)
    phone_reference: Optional[str] = None
    role: Optional[str] = Field("PUBLIC", description="Initial requested role (subject to validation)")


class UserLoginRequest(BaseModel):
    username_or_email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)
    device_info: Optional[str] = "Web Browser"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # Seconds
    user_id: str
    username: str
    email: str
    full_name: str
    roles: List[str]
    permissions: List[str]


class RefreshTokenRequest(BaseModel):
    refresh_token: str
    device_info: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    user_id: str
    username: str
    email: str
    full_name: str
    phone_reference: Optional[str] = None
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None
    roles: List[str]
    permissions: List[str]
    created_at: datetime


class UserDetailResponse(UserResponse):
    failed_login_attempts: int
    locked_until: Optional[datetime] = None
    updated_at: datetime
    active_sessions_count: int = 0


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class VerifyAccountRequest(BaseModel):
    user_id: str
    verification_code: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_token: str
    new_password: str = Field(..., min_length=8)


class UserSessionResponse(BaseModel):
    session_id: str
    user_id: str
    username: str
    ip_reference: Optional[str] = None
    user_agent: Optional[str] = None
    is_active: bool
    last_activity: datetime
    expires_at: datetime
    created_at: datetime


class SecurityAuditLogResponse(BaseModel):
    id: int
    audit_id: str
    user_id: Optional[int] = None
    username_snapshot: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    result: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Dict[str, Any] = {}
    timestamp: datetime


class RoleAssignRequest(BaseModel):
    role_name: str = Field(..., min_length=2, max_length=50)


class UserStatusUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    unlock_account: Optional[bool] = None


class SecurityStatsResponse(BaseModel):
    total_users: int
    active_users: int
    suspended_users: int
    users_by_role: Dict[str, int]
    active_sessions: int
    recent_failed_logins: int
    recent_security_alerts: int
    audit_log_count: int
