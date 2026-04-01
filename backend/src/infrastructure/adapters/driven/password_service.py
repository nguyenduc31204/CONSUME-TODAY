"""
Password Service — bcrypt hashing and verification.
Uses bcrypt directly (bypasses passlib compatibility issue with bcrypt 5.x).
"""
import bcrypt


class PasswordService:
    """Handles password hashing and verification using bcrypt."""

    ROUNDS = 12

    @staticmethod
    def hash(password: str) -> str:
        """Hash a plain-text password using bcrypt."""
        password_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt(rounds=PasswordService.ROUNDS)
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode("utf-8")

    @staticmethod
    def verify(plain_password: str, hashed_password: str) -> bool:
        """Verify a plain-text password against a bcrypt hash."""
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except Exception:
            return False
