"""
Wallet Entity — Represents a user's wallet (personal or shared).
"""
from typing import Optional
from src.domain.entities.base import BaseEntity
from uuid import UUID


class Wallet(BaseEntity):
    """Wallet entity — personal by default, shared after MVP."""

    def __init__(
        self,
        *,
        user_id: UUID,
        name: str,
        description: Optional[str] = None,
        color: str = "#9333EA",
        icon: str = "wallet",
        is_default: bool = False,
        is_personal: bool = True,
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
        self.user_id = user_id
        self.name = name
        self.description = description
        self.color = color
        self.icon = icon
        self.is_default = is_default
        self.is_personal = is_personal
        self.balance = 0  # Computed field, not authoritative

    # ── Business Logic ─────────────────────────────────

    def rename(self, name: str) -> None:
        if not name or len(name.strip()) == 0:
            raise ValueError("Wallet name cannot be empty")
        self.name = name.strip()
        self.touch()

    def update_color(self, color: str) -> None:
        self.color = color
        self.touch()

    def set_default(self) -> None:
        self.is_default = True
        self.touch()

    def unset_default(self) -> None:
        self.is_default = False
        self.touch()

    def __repr__(self) -> str:
        return f"<Wallet(id={self.id}, name={self.name}, default={self.is_default})>"
