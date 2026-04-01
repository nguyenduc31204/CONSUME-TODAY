"""
User Entity — Represents a user in the system.
Supports social login (Google/Apple) and email/password authentication.
"""
from typing import Optional
from src.domain.entities.base import BaseEntity
from uuid import UUID


class User(BaseEntity):
    """User entity — supports social login and email/password."""

    def __init__(
        self,
        *,
        email: str,
        name: str,
        avatar_url: Optional[str] = None,
        google_sub: Optional[str] = None,
        apple_sub: Optional[str] = None,
        hashed_password: Optional[str] = None,
        is_email_verified: bool = False,
        is_active: bool = True,
        id: Optional[UUID] = None,
        created_at=None,
        updated_at=None,
        deleted_at=None,
    ) -> None:
        super().__init__(
            id=id,
            created_at=created_at,
            updated_at=updated_at,
            deleted_at=deleted_at,
        )
        self.email = email
        self.name = name
        self.avatar_url = avatar_url
        self.google_sub = google_sub
        self.apple_sub = apple_sub
        self.hashed_password = hashed_password
        self.is_email_verified = is_email_verified
        self.is_active = is_active

    # ── Business Logic ─────────────────────────────────

    def has_password(self) -> bool:
        return self.hashed_password is not None

    def set_password(self, hashed_password: str) -> None:
        self.hashed_password = hashed_password
        self.touch()

    def clear_password(self) -> None:
        self.hashed_password = None
        self.touch()

    def update_profile(self, *, name: Optional[str] = None, avatar_url: Optional[str] = None) -> None:
        if name is not None:
            self.name = name
        if avatar_url is not None:
            self.avatar_url = avatar_url
        self.touch()

    def deactivate(self) -> None:
        self.is_active = False
        self.touch()

    def link_google(self, google_sub: str) -> None:
        self.google_sub = google_sub
        self.touch()

    def link_apple(self, apple_sub: str) -> None:
        self.apple_sub = apple_sub
        self.touch()

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, name={self.name})>"
