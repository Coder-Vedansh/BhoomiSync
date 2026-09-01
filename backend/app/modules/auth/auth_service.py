import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.auth.models import (
    User,
    Role,
    Permission,
    user_roles,
    RefreshToken,
    UserSession,
    SecurityAuditLog,
)
from app.modules.auth.password_service import PasswordService
from app.modules.auth.token_service import TokenService
from app.modules.auth.permissions import get_permissions_for_roles, Permissions
from app.modules.auth.audit_service import SecurityAuditService
from app.modules.auth.auth_schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
    UserDetailResponse,
    UserSessionResponse,
    SecurityStatsResponse,
)


class AuthService:
    """
    Comprehensive Authentication, Session Management, and RBAC Service.
    """

    def __init__(self, db: Session):
        self.db = db

    # --------------------------------------------------------------------------
    # 1. User Registration & Account Lifecycle
    # --------------------------------------------------------------------------

    def register_user(
        self,
        payload: UserRegisterRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> UserResponse:
        """
        Registers a new user account with secure password validation and audit logging.
        """
        # 1. Validate password strength
        valid_pwd, msg = PasswordService.validate_password_strength(payload.password)
        if not valid_pwd:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

        # 2. Check username and email uniqueness
        existing = (
            self.db.query(User)
            .filter(or_(User.username == payload.username.strip(), User.email == payload.email.lower().strip()))
            .first()
        )
        if existing:
            if existing.username.lower() == payload.username.lower().strip():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already taken.")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email address is already registered.")

        # 3. Resolve initial role (Default: PUBLIC)
        requested_role = (payload.role or "PUBLIC").upper().strip()
        role = self.db.query(Role).filter(Role.name == requested_role).first()
        if not role:
            role = self.db.query(Role).filter(Role.name == "PUBLIC").first()
            if not role:
                role = Role(name="PUBLIC", description="Citizen public access")
                self.db.add(role)
                self.db.commit()
                self.db.refresh(role)

        # 4. Create user
        user = User(
            user_id=f"USR-{uuid.uuid4().hex[:10].upper()}",
            username=payload.username.strip(),
            email=payload.email.lower().strip(),
            password_hash=PasswordService.hash_password(payload.password),
            full_name=payload.full_name.strip(),
            phone_reference=payload.phone_reference.strip() if payload.phone_reference else None,
            is_active=True,
            is_verified=True,  # Default to active for local dev/demo
        )
        user.roles.append(role)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        # 5. Log Security Audit
        SecurityAuditService.log_event(
            db=self.db,
            action="ACCOUNT_CREATED",
            user=user,
            resource_type="user",
            resource_id=user.user_id,
            result="SUCCESS",
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"assigned_role": role.name},
        )

        roles_list = [r.name for r in user.roles]
        perms_list = get_permissions_for_roles(roles_list)

        return UserResponse(
            id=user.id,
            user_id=user.user_id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            phone_reference=user.phone_reference,
            is_active=user.is_active,
            is_verified=user.is_verified,
            last_login=user.last_login,
            roles=roles_list,
            permissions=perms_list,
            created_at=user.created_at,
        )

    # --------------------------------------------------------------------------
    # 2. Authentication & Login
    # --------------------------------------------------------------------------

    def authenticate_user(
        self,
        payload: UserLoginRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> TokenResponse:
        """
        Authenticates user credentials, checks lockout status, creates session,
        and returns access and refresh tokens.
        """
        identifier = payload.username_or_email.strip().lower()
        now = datetime.utcnow()

        user = (
            self.db.query(User)
            .filter(or_(func.lower(User.username) == identifier, func.lower(User.email) == identifier))
            .first()
        )

        if not user:
            # Generic error to prevent account enumeration
            SecurityAuditService.log_event(
                db=self.db,
                action="LOGIN_FAILURE",
                username_snapshot=payload.username_or_email,
                resource_type="auth",
                result="FAILURE",
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"reason": "User not found"},
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username/email or password.",
            )

        # Check if account is locked
        if user.locked_until and user.locked_until > now:
            remaining_mins = int((user.locked_until - now).total_seconds() / 60) + 1
            SecurityAuditService.log_event(
                db=self.db,
                action="LOGIN_BLOCKED_LOCKED",
                user=user,
                resource_type="auth",
                result="DENIED",
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"remaining_minutes": remaining_mins},
            )
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account is temporarily locked due to excessive failed attempts. Please try again in {remaining_mins} minutes.",
            )

        # Check if account is disabled
        if not user.is_active:
            SecurityAuditService.log_event(
                db=self.db,
                action="LOGIN_BLOCKED_INACTIVE",
                user=user,
                resource_type="auth",
                result="DENIED",
                ip_address=ip_address,
                user_agent=user_agent,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Please contact your administrator.",
            )

        # Verify password
        if not PasswordService.verify_password(payload.password, user.password_hash):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                user.locked_until = now + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
                SecurityAuditService.log_event(
                    db=self.db,
                    action="ACCOUNT_LOCKED",
                    user=user,
                    resource_type="auth",
                    result="DENIED",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    metadata={"failed_attempts": user.failed_login_attempts, "lockout_minutes": settings.LOCKOUT_DURATION_MINUTES},
                )
            else:
                SecurityAuditService.log_event(
                    db=self.db,
                    action="LOGIN_FAILURE",
                    user=user,
                    resource_type="auth",
                    result="FAILURE",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    metadata={"failed_attempts": user.failed_login_attempts},
                )
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username/email or password.",
            )

        # Successful Login
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login = now

        roles_list = [r.name for r in user.roles]
        perms_list = get_permissions_for_roles(roles_list)

        # Create UserSession
        session_id = f"SESS-{uuid.uuid4().hex[:12].upper()}"
        session = UserSession(
            session_id=session_id,
            user_id=user.id,
            ip_reference=ip_address,
            user_agent=user_agent,
            is_active=True,
            last_activity=now,
            expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        self.db.add(session)

        # Create Refresh Token
        raw_refresh_token = TokenService.generate_refresh_token_string()
        token_hash = TokenService.hash_refresh_token(raw_refresh_token)
        family_id = uuid.uuid4().hex[:16]

        refresh_record = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            family_id=family_id,
            device_reference=payload.device_info or user_agent,
            expires_at=TokenService.calculate_refresh_token_expiry(),
            is_revoked=False,
        )
        self.db.add(refresh_record)
        self.db.commit()

        # Create JWT Access Token
        access_token = TokenService.create_access_token(
            user_id=user.user_id,
            username=user.username,
            email=user.email,
            roles=roles_list,
            permissions=perms_list,
        )

        # Audit Success
        SecurityAuditService.log_event(
            db=self.db,
            action="LOGIN_SUCCESS",
            user=user,
            resource_type="auth",
            resource_id=session_id,
            result="SUCCESS",
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"roles": roles_list},
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.user_id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            roles=roles_list,
            permissions=perms_list,
        )

    # --------------------------------------------------------------------------
    # 3. Token Refresh & Reuse Detection
    # --------------------------------------------------------------------------

    def refresh_access_token(
        self,
        raw_refresh_token: str,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> TokenResponse:
        """
        Validates refresh token, executes token rotation, and detects reuse of revoked tokens.
        """
        now = datetime.utcnow()
        token_hash = TokenService.hash_refresh_token(raw_refresh_token)

        token_record = self.db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
            )

        user = self.db.query(User).filter(User.id == token_record.user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is deactivated or no longer exists.",
            )

        # Token Reuse Detection (Replay of already-revoked refresh token)
        if token_record.is_revoked:
            # Revoke ALL tokens belonging to the same token family
            self.db.query(RefreshToken).filter(RefreshToken.family_id == token_record.family_id).update(
                {"is_revoked": True, "revoked_at": now}
            )
            # Revoke active user sessions
            self.db.query(UserSession).filter(UserSession.user_id == user.id).update(
                {"is_active": False, "revoked_at": now}
            )
            self.db.commit()

            # High Priority Security Audit Alert
            SecurityAuditService.log_event(
                db=self.db,
                action="TOKEN_REUSE_ATTACK_DETECTED",
                user=user,
                resource_type="auth",
                resource_id=token_record.family_id,
                result="DENIED",
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"revoked_family_id": token_record.family_id},
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Security alert: Revoked refresh token reuse detected. All active sessions have been terminated.",
            )

        if token_record.expires_at < now:
            token_record.is_revoked = True
            token_record.revoked_at = now
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired. Please log in again.",
            )

        # Rotate Refresh Token
        token_record.is_revoked = True
        token_record.revoked_at = now

        new_raw_refresh_token = TokenService.generate_refresh_token_string()
        new_token_hash = TokenService.hash_refresh_token(new_raw_refresh_token)

        new_refresh_record = RefreshToken(
            user_id=user.id,
            token_hash=new_token_hash,
            family_id=token_record.family_id,  # Maintain token family
            device_reference=device_info or user_agent,
            expires_at=TokenService.calculate_refresh_token_expiry(),
            is_revoked=False,
        )
        self.db.add(new_refresh_record)
        self.db.commit()

        roles_list = [r.name for r in user.roles]
        perms_list = get_permissions_for_roles(roles_list)

        new_access_token = TokenService.create_access_token(
            user_id=user.user_id,
            username=user.username,
            email=user.email,
            roles=roles_list,
            permissions=perms_list,
        )

        SecurityAuditService.log_event(
            db=self.db,
            action="TOKEN_REFRESH_SUCCESS",
            user=user,
            resource_type="auth",
            result="SUCCESS",
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_raw_refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.user_id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            roles=roles_list,
            permissions=perms_list,
        )

    # --------------------------------------------------------------------------
    # 4. Logout & Session Termination
    # --------------------------------------------------------------------------

    def logout(
        self,
        current_user: User,
        raw_refresh_token: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> bool:
        """
        Logs out the current user session and revokes the associated refresh token.
        """
        now = datetime.utcnow()
        if raw_refresh_token:
            token_hash = TokenService.hash_refresh_token(raw_refresh_token)
            self.db.query(RefreshToken).filter(
                RefreshToken.user_id == current_user.id,
                RefreshToken.token_hash == token_hash,
            ).update({"is_revoked": True, "revoked_at": now})

        SecurityAuditService.log_event(
            db=self.db,
            action="LOGOUT",
            user=current_user,
            resource_type="auth",
            result="SUCCESS",
            ip_address=ip_address,
        )
        self.db.commit()
        return True

    def logout_all_sessions(
        self,
        current_user: User,
        ip_address: Optional[str] = None,
    ) -> int:
        """
        Revokes all refresh tokens and terminates all active sessions for the user.
        """
        now = datetime.utcnow()
        revoked_tokens = (
            self.db.query(RefreshToken)
            .filter(RefreshToken.user_id == current_user.id, RefreshToken.is_revoked == False)
            .update({"is_revoked": True, "revoked_at": now})
        )
        revoked_sessions = (
            self.db.query(UserSession)
            .filter(UserSession.user_id == current_user.id, UserSession.is_active == True)
            .update({"is_active": False, "revoked_at": now})
        )
        self.db.commit()

        SecurityAuditService.log_event(
            db=self.db,
            action="LOGOUT_ALL",
            user=current_user,
            resource_type="auth",
            result="SUCCESS",
            ip_address=ip_address,
            metadata={"revoked_tokens": revoked_tokens, "revoked_sessions": revoked_sessions},
        )
        return revoked_sessions

    # --------------------------------------------------------------------------
    # 5. Password Management
    # --------------------------------------------------------------------------

    def change_password(
        self,
        current_user: User,
        current_password: str,
        new_password: str,
        ip_address: Optional[str] = None,
    ) -> bool:
        """
        Changes the authenticated user's password and revokes existing sessions.
        """
        if not PasswordService.verify_password(current_password, current_user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")

        valid_pwd, msg = PasswordService.validate_password_strength(new_password)
        if not valid_pwd:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

        current_user.password_hash = PasswordService.hash_password(new_password)
        self.db.commit()

        # Invalidate old sessions
        self.logout_all_sessions(current_user, ip_address=ip_address)

        SecurityAuditService.log_event(
            db=self.db,
            action="PASSWORD_CHANGED",
            user=current_user,
            resource_type="auth",
            result="SUCCESS",
            ip_address=ip_address,
        )
        return True

    # --------------------------------------------------------------------------
    # 6. Admin User Management & RBAC
    # --------------------------------------------------------------------------

    def list_users(
        self,
        role_filter: Optional[str] = None,
        is_active: Optional[bool] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[UserDetailResponse], int]:
        """
        Lists registered users with roles, session counts, and audit statistics.
        """
        query = self.db.query(User)

        if role_filter and role_filter != "All":
            query = query.join(User.roles).filter(Role.name == role_filter.upper())
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        if search_query:
            term = f"%{search_query.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(User.username).like(term),
                    func.lower(User.email).like(term),
                    func.lower(User.full_name).like(term),
                    func.lower(User.user_id).like(term),
                )
            )

        total = query.count()
        users = query.order_by(desc(User.created_at)).offset(skip).limit(limit).all()

        results = []
        for u in users:
            roles = [r.name for r in u.roles]
            perms = get_permissions_for_roles(roles)
            active_sess = self.db.query(UserSession).filter(UserSession.user_id == u.id, UserSession.is_active == True).count()
            results.append(
                UserDetailResponse(
                    id=u.id,
                    user_id=u.user_id,
                    username=u.username,
                    email=u.email,
                    full_name=u.full_name,
                    phone_reference=u.phone_reference,
                    is_active=u.is_active,
                    is_verified=u.is_verified,
                    last_login=u.last_login,
                    failed_login_attempts=u.failed_login_attempts,
                    locked_until=u.locked_until,
                    roles=roles,
                    permissions=perms,
                    created_at=u.created_at,
                    updated_at=u.updated_at,
                    active_sessions_count=active_sess,
                )
            )

        return results, total

    def update_user_status(
        self,
        target_user_id: str,
        is_active: Optional[bool] = None,
        is_verified: Optional[bool] = None,
        unlock_account: Optional[bool] = None,
        admin_user: Optional[User] = None,
    ) -> UserDetailResponse:
        """
        Updates user active status or unlocks account.
        """
        user = self.db.query(User).filter(User.user_id == target_user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        if is_active is not None:
            user.is_active = is_active
            if not is_active:
                # Terminate sessions if deactivated
                self.logout_all_sessions(user)

        if is_verified is not None:
            user.is_verified = is_verified

        if unlock_account:
            user.failed_login_attempts = 0
            user.locked_until = None

        self.db.commit()
        self.db.refresh(user)

        SecurityAuditService.log_event(
            db=self.db,
            action="USER_STATUS_UPDATED",
            user=admin_user,
            resource_type="user",
            resource_id=user.user_id,
            result="SUCCESS",
            metadata={"is_active": user.is_active, "is_verified": user.is_verified, "unlocked": unlock_account},
        )

        roles = [r.name for r in user.roles]
        return UserDetailResponse(
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
            permissions=get_permissions_for_roles(roles),
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    def assign_role_to_user(
        self,
        target_user_id: str,
        role_name: str,
        admin_user: Optional[User] = None,
    ) -> UserDetailResponse:
        """
        Assigns a role to a user.
        """
        user = self.db.query(User).filter(User.user_id == target_user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        role = self.db.query(Role).filter(Role.name == role_name.upper().strip()).first()
        if not role:
            role = Role(name=role_name.upper().strip(), description=f"{role_name} Role")
            self.db.add(role)
            self.db.commit()
            self.db.refresh(role)

        if role not in user.roles:
            user.roles.append(role)
            self.db.commit()

        SecurityAuditService.log_event(
            db=self.db,
            action="ROLE_ASSIGNED",
            user=admin_user,
            resource_type="user",
            resource_id=user.user_id,
            result="SUCCESS",
            metadata={"assigned_role": role.name},
        )

        roles = [r.name for r in user.roles]
        return UserDetailResponse(
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
            permissions=get_permissions_for_roles(roles),
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    def remove_role_from_user(
        self,
        target_user_id: str,
        role_name: str,
        admin_user: Optional[User] = None,
    ) -> UserDetailResponse:
        """
        Removes a role from a user.
        """
        user = self.db.query(User).filter(User.user_id == target_user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        role = self.db.query(Role).filter(Role.name == role_name.upper().strip()).first()
        if role and role in user.roles:
            user.roles.remove(role)
            self.db.commit()

        SecurityAuditService.log_event(
            db=self.db,
            action="ROLE_REMOVED",
            user=admin_user,
            resource_type="user",
            resource_id=user.user_id,
            result="SUCCESS",
            metadata={"removed_role": role_name},
        )

        roles = [r.name for r in user.roles]
        return UserDetailResponse(
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
            permissions=get_permissions_for_roles(roles),
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    def get_user_sessions(
        self,
        user_id: Optional[str] = None,
    ) -> List[UserSessionResponse]:
        """
        Returns active sessions.
        """
        query = self.db.query(UserSession).join(UserSession.user)
        if user_id:
            query = query.filter(User.user_id == user_id)

        sessions = query.filter(UserSession.is_active == True).order_by(desc(UserSession.last_activity)).limit(50).all()
        return [
            UserSessionResponse(
                session_id=s.session_id,
                user_id=s.user.user_id,
                username=s.user.username,
                ip_reference=s.ip_reference,
                user_agent=s.user_agent,
                is_active=s.is_active,
                last_activity=s.last_activity,
                expires_at=s.expires_at,
                created_at=s.created_at,
            )
            for s in sessions
        ]

    def revoke_session(
        self,
        session_id: str,
        admin_user: Optional[User] = None,
    ) -> bool:
        """
        Revokes a user session by session_id.
        """
        now = datetime.utcnow()
        session = self.db.query(UserSession).filter(UserSession.session_id == session_id).first()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

        session.is_active = False
        session.revoked_at = now
        self.db.commit()

        SecurityAuditService.log_event(
            db=self.db,
            action="SESSION_REVOKED",
            user=admin_user,
            resource_type="session",
            resource_id=session_id,
            result="SUCCESS",
        )
        return True

    def get_security_stats(self) -> SecurityStatsResponse:
        """
        Computes aggregated security and user statistics for Admin Dashboard.
        """
        total_users = self.db.query(User).count()
        active_users = self.db.query(User).filter(User.is_active == True).count()
        suspended_users = total_users - active_users

        # Roles breakdown
        role_counts = {}
        for role in self.db.query(Role).all():
            cnt = self.db.query(user_roles).filter(user_roles.c.role_id == role.id).count()
            role_counts[role.name] = cnt

        active_sessions = self.db.query(UserSession).filter(UserSession.is_active == True).count()
        
        # Recent failed attempts & security alerts
        one_day_ago = datetime.utcnow() - timedelta(days=1)
        failed_logins = self.db.query(SecurityAuditLog).filter(
            SecurityAuditLog.action.in_(["LOGIN_FAILURE", "ACCOUNT_LOCKED"]),
            SecurityAuditLog.timestamp >= one_day_ago,
        ).count()
        alerts = self.db.query(SecurityAuditLog).filter(
            SecurityAuditLog.action.in_(["TOKEN_REUSE_ATTACK_DETECTED", "ACCOUNT_LOCKED", "AUTHORIZATION_DENIED"]),
            SecurityAuditLog.timestamp >= one_day_ago,
        ).count()
        total_logs = self.db.query(SecurityAuditLog).count()

        return SecurityStatsResponse(
            total_users=total_users,
            active_users=active_users,
            suspended_users=suspended_users,
            users_by_role=role_counts,
            active_sessions=active_sessions,
            recent_failed_logins=failed_logins,
            recent_security_alerts=alerts,
            audit_log_count=total_logs,
        )
