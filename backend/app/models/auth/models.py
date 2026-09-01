import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    Text,
    Table,
    Index,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


# Many-to-Many association table between User and Role
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

# Many-to-Many association table between Role and Permission
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    """
    User account model supporting secure authentication, account status,
    and lockout protection.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"USR-{uuid.uuid4().hex[:10].upper()}")
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone_reference = Column(String(100), nullable=True)  # Masked or pseudonymized
    
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    last_login = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    roles = relationship("Role", secondary=user_roles, back_populates="users", lazy="joined")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("SecurityAuditLog", back_populates="user", cascade="all, delete-orphan")

    def has_role(self, role_name: str) -> bool:
        return any(r.name.upper() == role_name.upper() for r in self.roles)

    def has_permission(self, permission_name: str) -> bool:
        # Admin superuser role inherits all permissions
        if self.has_role("ADMIN"):
            return True
        for r in self.roles:
            for p in r.permissions:
                if p.name == permission_name or p.name == "*":
                    return True
        return False

    @property
    def permissions_list(self) -> List[str]:
        if self.has_role("ADMIN"):
            return ["*"]
        perms = set()
        for r in self.roles:
            for p in r.permissions:
                perms.add(p.name)
        return sorted(list(perms))


class Role(Base):
    """
    Role entity (e.g. PUBLIC, SURVEYOR, GOVERNMENT_OFFICIAL, ADMIN).
    """
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    is_system_role = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles", lazy="joined")


class Permission(Base):
    """
    Granular permission entity (e.g. parcel.verify, land_record.import).
    """
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    resource_type = Column(String(50), nullable=True)  # parcel, ai, survey, user, audit, etc.
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")


class RefreshToken(Base):
    """
    Securely hashed rotatable and revocable refresh token.
    Never stores plaintext token strings.
    """
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)  # SHA-256 hash of token
    family_id = Column(String(50), index=True, nullable=False)  # For token rotation tracking
    device_reference = Column(String(255), nullable=True)
    is_revoked = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")


class UserSession(Base):
    """
    Active user login session tracking IP address, User-Agent, and activity timestamp.
    """
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"SESS-{uuid.uuid4().hex[:12].upper()}")
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ip_reference = Column(String(100), nullable=True)
    user_agent = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_activity = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="sessions")


class SecurityAuditLog(Base):
    """
    Immutable security audit trail recording authentication events, authorization checks,
    boundary verifications, role modifications, and suspicious activity.
    """
    __tablename__ = "security_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"AUD-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:6].upper()}")
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    username_snapshot = Column(String(100), nullable=True)  # Snapshot in case user is deleted
    action = Column(String(100), nullable=False, index=True)  # LOGIN_SUCCESS, LOGIN_FAILURE, PARCEL_VERIFIED, etc.
    resource_type = Column(String(50), nullable=True, index=True)  # auth, parcel, ai, land_record, user
    resource_id = Column(String(100), nullable=True, index=True)
    result = Column(String(20), default="SUCCESS", nullable=False)  # SUCCESS, FAILURE, DENIED
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(String(255), nullable=True)
    metadata_json = Column(JSON, default=dict, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
