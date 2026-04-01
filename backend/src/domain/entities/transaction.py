"""
Transaction Entity — Represents a captured expense or life-log entry.
Core of the MemoirFinance experience.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from src.domain.entities.base import BaseEntity


class Transaction(BaseEntity):
    """Transaction entity — either an expense (amount > 0) or life-log (amount = 0)."""

    # Status constants
    STATUS_PENDING = "pending"
    STATUS_CONFIRMED = "confirmed"

    def __init__(
        self,
        *,
        user_id: UUID,
        wallet_id: UUID,
        category_id: Optional[UUID] = None,
        image_url: Optional[str] = None,
        thumbnail_url: Optional[str] = None,
        merchant_name: Optional[str] = None,
        amount: int = 0,
        currency: str = "VND",
        transaction_date: Optional[datetime] = None,
        note: Optional[str] = None,
        ocr_confidence: float = 0.0,
        is_life_log: bool = False,
        transaction_status: str = "pending",
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
        self.wallet_id = wallet_id
        self.category_id = category_id
        self.image_url = image_url
        self.thumbnail_url = thumbnail_url
        self.merchant_name = merchant_name
        self.amount = amount
        self.currency = currency
        self.transaction_date = transaction_date
        self.note = note
        self.ocr_confidence = ocr_confidence
        self.is_life_log = is_life_log
        self.transaction_status = transaction_status

    # ── Business Logic ─────────────────────────────────

    def is_expense(self) -> bool:
        return self.amount > 0

    def is_pending(self) -> bool:
        return self.transaction_status == self.STATUS_PENDING

    def is_confirmed(self) -> bool:
        return self.transaction_status == self.STATUS_CONFIRMED

    def confirm(self) -> None:
        """Mark transaction as confirmed (auto-save or user confirmation)."""
        self.transaction_status = self.STATUS_CONFIRMED
        self.touch()

    def convert_to_expense(self, amount: int, category_id: UUID) -> None:
        """Convert a life-log entry to a financial transaction."""
        self.amount = amount
        self.category_id = category_id
        self.is_life_log = False
        self.transaction_status = self.STATUS_CONFIRMED
        self.touch()

    def update_amount(self, amount: int) -> None:
        self.amount = amount
        if amount > 0:
            self.is_life_log = False
        self.touch()

    def update_category(self, category_id: UUID) -> None:
        self.category_id = category_id
        self.touch()

    def update_wallet(self, wallet_id: UUID) -> None:
        self.wallet_id = wallet_id
        self.touch()

    def __repr__(self) -> str:
        return (
            f"<Transaction(id={self.id}, merchant={self.merchant_name}, "
            f"amount={self.amount} {self.currency}, life_log={self.is_life_log})>"
        )
