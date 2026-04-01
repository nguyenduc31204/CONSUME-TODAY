"""
Wallet Entity — Represents a user's wallet (personal or shared).
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from dataclasses import dataclass

from src.domain.entities.base import BaseEntity


@dataclass
class Wallet(BaseEntity):
    """
    Wallet entity — personal by default, shared after MVP.
    """

    user_id: UUID
    name: str
    description: Optional[str] = None
    color: str = "#9333EA"  # memoir-purple default
    icon: str = "wallet"  # Lucide icon name
    is_default: bool = False  # Only one default per user
    is_personal: bool = True  # Shared wallets after MVP
    balance: int = 0  # Computed field, not authoritative

    # ── Business Logic ─────────────────────────────────

    def rename(self, name: str) -> None:
        """Rename the wallet."""
        if not name or len(name.strip()) == 0:
            raise ValueError("Wallet name cannot be empty")
        self.name = name.strip()
        self.touch()

    def update_color(self, color: str) -> None:
        """Update wallet color."""
        self.color = color
        self.touch()

    def set_default(self) -> None:
        """Mark this wallet as the user's default."""
        self.is_default = True
        self.touch()

    def unset_default(self) -> None:
        """Unmark this wallet as default."""
        self.is_default = False
        self.touch()

    def __repr__(self) -> str:
        return f"<Wallet(id={self.id}, name={self.name}, default={self.is_default})>"
