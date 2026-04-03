"""
Request DTOs — Pydantic models for Transaction requests.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TransactionCreateRequest(BaseModel):
    """Request to create a transaction (manual entry — OCR uses multipart)."""

    wallet_id: UUID
    category_id: UUID | None = None
    amount: int = Field(..., ge=0, description="Amount in VND")
    merchant_name: str | None = Field(None, max_length=255)
    transaction_date: datetime | None = None
    note: str | None = Field(None, max_length=500)
    is_life_log: bool = False


class TransactionUpdateRequest(BaseModel):
    """Request to update a transaction (human-in-the-loop edit)."""

    amount: int | None = Field(None, ge=0, description="Amount in VND")
    category_id: UUID | None = None
    wallet_id: UUID | None = None
    note: str | None = Field(None, max_length=500)
    merchant_name: str | None = Field(None, max_length=255)


class TransactionListRequest(BaseModel):
    """Request to list transactions with filters."""

    wallet_id: UUID | None = None
    category_id: UUID | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    skip: int = Field(0, ge=0)
    limit: int = Field(50, ge=1, le=100)
