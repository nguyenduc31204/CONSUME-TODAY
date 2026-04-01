"""
User Entity — Represents a user in the system.
Social login (Google/Apple) — no password.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from dataclasses import dataclass

from src.domain.entities.base import BaseEntity


@dataclass
class User(BaseEntity):
    """
    User entity — created on first social login.
    No email/password authentication.
    """

    email: str
    name: str
    avatar_url: Optional[str] = None
    google_sub: Optional[str] = None  # Google OAuth subject ID
    apple_sub: Optional[str] = None   # Apple Sign-In subject ID
    is_active: bool = True

    # ── Business Logic ─────────────────────────────────

    def update_profile(self, *, name: Optional[str] = None, avatar_url: Optional[str] = None) -> None:
        """Update user profile information."""
        if name is not None:
            self.name = name
        if avatar_url is not None:
            self.avatar_url = avatar_url
        self.touch()

    def deactivate(self) -> None:
        """Deactivate user account."""
        self.is_active = False
        self.touch()

    def link_google(self, google_sub: str) -> None:
        """Link Google account."""
        self.google_sub = google_sub
        self.touch()

    def link_apple(self, apple_sub: str) -> None:
        """Link Apple account."""
        self.apple_sub = apple_sub
        self.touch()

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, name={self.name})>"
