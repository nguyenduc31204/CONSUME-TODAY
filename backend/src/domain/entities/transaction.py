"""
Transaction Entity — Represents a captured expense or life-log entry.
Core of the MemoirFinance experience.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from dataclasses import dataclass, field

from src.domain.entities.base import BaseEntity


@dataclass
class Transaction(BaseEntity):
    """
    Transaction entity — either an expense (amount > 0) or life-log (amount = 0).
    """

    user_id: UUID
    wallet_id: UUID
    category_id: Optional[UUID] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    merchant_name: Optional[str] = None
    amount: int = 0  # Amount in VND (integer, no floating point)
    currency: str = "VND"
    transaction_date: Optional[datetime] = None
    note: Optional[str] = None
    ocr_confidence: float = 0.0  # 0.0–1.0
    is_life_log: bool = False  # True = photo without receipt (amount=0)

    # ── Business Logic ─────────────────────────────────

    def is_expense(self) -> bool:
        """Check if this is a financial transaction (vs life-log)."""
        return self.amount > 0

    def convert_to_expense(self, amount: int, category_id: UUID) -> None:
        """Convert a life-log photo to an expense transaction."""
        self.amount = amount
        self.category_id = category_id
        self.is_life_log = False
        self.touch()

    def update_amount(self, amount: int) -> None:
        """Update the transaction amount."""
        self.amount = amount
        if amount > 0:
            self.is_life_log = False
        self.touch()

    def update_category(self, category_id: UUID) -> None:
        """Change the category."""
        self.category_id = category_id
        self.touch()

    def update_wallet(self, wallet_id: UUID) -> None:
        """Move transaction to a different wallet."""
        self.wallet_id = wallet_id
        self.touch()

    def __repr__(self) -> str:
        return (
            f"<Transaction(id={self.id}, merchant={self.merchant_name}, "
            f"amount={self.amount} {self.currency}, life_log={self.is_life_log})>"
        )
