from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.auth.models import SecurityAuditLog, User


class SecurityAuditService:
    """
    Centralized Security Audit Service.
    Creates immutable security audit records and enforces secret sanitization.
    """

    SENSITIVE_KEYS = {
        "password", "password_hash", "access_token", "refresh_token",
        "token", "secret", "authorization", "raw_token", "old_password", "new_password"
    }

    @classmethod
    def sanitize_metadata(cls, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recursively redacts sensitive keys from audit log metadata.
        """
        if not metadata:
            return {}
        sanitized = {}
        for k, v in metadata.items():
            if k.lower() in cls.SENSITIVE_KEYS:
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, dict):
                sanitized[k] = cls.sanitize_metadata(v)
            elif isinstance(v, list):
                sanitized[k] = [
                    cls.sanitize_metadata(item) if isinstance(item, dict) else item
                    for item in v
                ]
            else:
                sanitized[k] = v
        return sanitized

    @classmethod
    def log_event(
        cls,
        db: Session,
        action: str,
        user: Optional[User] = None,
        user_id: Optional[int] = None,
        username_snapshot: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        result: str = "SUCCESS",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SecurityAuditLog:
        """
        Creates and persists an immutable security audit event.
        """
        actual_user_id = user.id if user else user_id
        actual_username = username_snapshot or (user.username if user else None)
        sanitized_meta = cls.sanitize_metadata(metadata or {})

        entry = SecurityAuditLog(
            user_id=actual_user_id,
            username_snapshot=actual_username,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            result=result,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata_json=sanitized_meta,
            timestamp=datetime.utcnow(),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def get_audit_logs(
        db: Session,
        action: Optional[str] = None,
        user_id: Optional[int] = None,
        resource_type: Optional[str] = None,
        result: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[SecurityAuditLog]:
        """
        Retrieves paginated audit logs with optional filters.
        """
        query = db.query(SecurityAuditLog)
        if action:
            query = query.filter(SecurityAuditLog.action == action)
        if user_id:
            query = query.filter(SecurityAuditLog.user_id == user_id)
        if resource_type:
            query = query.filter(SecurityAuditLog.resource_type == resource_type)
        if result:
            query = query.filter(SecurityAuditLog.result == result)

        return query.order_by(desc(SecurityAuditLog.timestamp)).offset(skip).limit(limit).all()

    @staticmethod
    def count_audit_logs(
        db: Session,
        action: Optional[str] = None,
        user_id: Optional[int] = None,
        resource_type: Optional[str] = None,
        result: Optional[str] = None,
    ) -> int:
        """
        Counts total matching audit logs for pagination.
        """
        query = db.query(SecurityAuditLog)
        if action:
            query = query.filter(SecurityAuditLog.action == action)
        if user_id:
            query = query.filter(SecurityAuditLog.user_id == user_id)
        if resource_type:
            query = query.filter(SecurityAuditLog.resource_type == resource_type)
        if result:
            query = query.filter(SecurityAuditLog.result == result)

        return query.count()
