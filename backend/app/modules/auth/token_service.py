import jwt
import secrets
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from app.core.config import settings


class TokenService:
    """
    Cryptographic Token Management Service for BhoomiSync.
    Manages JWT access tokens and rotatable, revocable refresh tokens.
    """

    @staticmethod
    def create_access_token(
        user_id: str,
        username: str,
        email: str,
        roles: List[str],
        permissions: List[str],
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        """
        Creates a signed JWT access token.
        """
        now_ts = int(time.time())
        if expires_delta:
            exp_ts = now_ts + int(expires_delta.total_seconds())
        else:
            exp_ts = now_ts + (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

        payload: Dict[str, Any] = {
            "sub": user_id,
            "username": username,
            "email": email,
            "roles": roles,
            "permissions": permissions,
            "iat": now_ts,
            "exp": exp_ts,
            "jti": secrets.token_hex(8),
            "iss": "BhoomiSync-Auth-Engine",
        }

        encoded_jwt = jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        return encoded_jwt


    @staticmethod
    def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
        """
        Decodes and validates a JWT access token.
        Returns payload dict if valid, or None if expired/tampered.
        """
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                issuer="BhoomiSync-Auth-Engine",
            )
            return payload
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None

    @staticmethod
    def generate_refresh_token_string() -> str:
        """
        Generates a high-entropy cryptographically secure refresh token string.
        """
        return secrets.token_urlsafe(48)

    @staticmethod
    def hash_refresh_token(raw_token: str) -> str:
        """
        Computes the SHA-256 hash of a refresh token.
        Raw tokens are never stored in the database.
        """
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    @staticmethod
    def calculate_refresh_token_expiry() -> datetime:
        """
        Calculates the refresh token expiration datetime.
        """
        return datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
