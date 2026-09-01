import bcrypt
import re
from typing import Tuple


class PasswordService:
    """
    Industry-standard password hashing and validation service using bcrypt.
    Never stores or handles plaintext passwords outside of hashing/verification operations.
    """

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hashes a plaintext password using bcrypt with 12 salt rounds.
        """
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verifies plaintext password against stored bcrypt hash in constant time.
        """
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except Exception:
            return False

    @staticmethod
    def validate_password_strength(password: str) -> Tuple[bool, str]:
        """
        Enforces password complexity rules:
        - Minimum 8 characters
        - Contains uppercase letter
        - Contains lowercase letter
        - Contains digit
        - Contains special character (@$!%*?&#)
        """
        if len(password) < 8:
            return False, "Password must be at least 8 characters long."
        if not re.search(r"[A-Z]", password):
            return False, "Password must contain at least one uppercase letter."
        if not re.search(r"[a-z]", password):
            return False, "Password must contain at least one lowercase letter."
        if not re.search(r"\d", password):
            return False, "Password must contain at least one digit."
        if not re.search(r"[@$!%*?&#._-]", password):
            return False, "Password must contain at least one special character (@$!%*?&#._-)."
        return True, "Password meets complexity requirements."
