from typing import Optional, List, Callable
from datetime import datetime
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.config import settings
from app.models.auth.models import User, Role
from app.modules.auth.token_service import TokenService
from app.modules.auth.audit_service import SecurityAuditService


# OAuth2 password bearer configuration (auto_error=False allows public fallback)
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,
)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    x_user_role: Optional[str] = Header(None, description="[DEV ONLY] Legacy test role header"),
    db: Session = Depends(get_db),
) -> User:
    """
    Extracts and validates the current authenticated user from Bearer JWT token.
    Falls back to development mock identity if ALLOW_DEV_HEADER_AUTH is enabled.
    """
    # 1. Primary Path: Validate Bearer JWT Token
    if token:
        payload = TokenService.decode_access_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired access token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed token payload.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account no longer exists.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated.",
            )

        if user.locked_until and user.locked_until > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="User account is temporarily locked due to excessive failed attempts.",
            )

        return user

    # 2. Development / Testing Fallback (Only active if ALLOW_DEV_HEADER_AUTH is enabled)
    if settings.ALLOW_DEV_HEADER_AUTH:
        target_role = (x_user_role or "ADMIN").upper().strip()
        user = db.query(User).join(User.roles).filter(Role.name == target_role).first()
        if user and user.is_active:
            return user
        # Fallback to demo user by username
        demo_user = db.query(User).filter(User.username == target_role.lower()).first()
        if demo_user and demo_user.is_active:
            return demo_user
        # Final fallback to any admin
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            return admin_user


    # 3. Unauthorized
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials were not provided or are invalid.",
        headers={"WWW-Authenticate": "Bearer"},
    )



def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    x_user_role: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Returns the authenticated User if valid credentials or dev header is present,
    otherwise returns None without raising an HTTPException.
    """
    try:
        return get_current_user(token=token, x_user_role=x_user_role, db=db)
    except HTTPException:
        return None


def require_authenticated_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Ensures that the request is made by a verified, active authenticated user.
    """
    return current_user


def require_role(role_name: str) -> Callable:
    """
    Factory dependency checking if the authenticated user has a specific role.
    """
    def role_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not current_user.has_role(role_name) and not current_user.has_role("ADMIN"):
            SecurityAuditService.log_event(
                db=db,
                action="AUTHORIZATION_DENIED",
                user=current_user,
                resource_type="role",
                resource_id=role_name,
                result="DENIED",
                metadata={"required_role": role_name, "user_roles": [r.name for r in current_user.roles]},
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires role: {role_name}.",
            )
        return current_user

    return role_checker


def require_permission(permission_name: str) -> Callable:
    """
    Factory dependency checking if the authenticated user possesses a granular permission.
    """
    def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not current_user.has_permission(permission_name):
            SecurityAuditService.log_event(
                db=db,
                action="AUTHORIZATION_DENIED",
                user=current_user,
                resource_type="permission",
                resource_id=permission_name,
                result="DENIED",
                metadata={"required_permission": permission_name, "user_roles": [r.name for r in current_user.roles]},
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Missing required permission: {permission_name}.",
            )
        return current_user

    return permission_checker


def require_any_permission(*permissions: str) -> Callable:
    """
    Factory dependency checking if user has AT LEAST ONE of the specified permissions.
    """
    def any_permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        has_any = any(current_user.has_permission(p) for p in permissions)
        if not has_any:
            SecurityAuditService.log_event(
                db=db,
                action="AUTHORIZATION_DENIED",
                user=current_user,
                resource_type="permission_group",
                resource_id=",".join(permissions),
                result="DENIED",
                metadata={"required_any_of": list(permissions)},
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of permissions: {list(permissions)}.",
            )
        return current_user

    return any_permission_checker


def require_all_permissions(*permissions: str) -> Callable:
    """
    Factory dependency checking if user has ALL of the specified permissions.
    """
    def all_permissions_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        has_all = all(current_user.has_permission(p) for p in permissions)
        if not has_all:
            SecurityAuditService.log_event(
                db=db,
                action="AUTHORIZATION_DENIED",
                user=current_user,
                resource_type="permission_group",
                resource_id=",".join(permissions),
                result="DENIED",
                metadata={"required_all_of": list(permissions)},
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires all permissions: {list(permissions)}.",
            )
        return current_user

    return all_permissions_checker
