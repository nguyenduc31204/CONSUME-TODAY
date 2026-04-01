"""
Request DTOs — Pydantic models for Transaction requests.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class TransactionCreateRequest(BaseModel):
    """Request to create a transaction (manual entry — OCR uses multipart)."""

    wallet_id: UUID
    category_id: Optional[UUID] = None
    amount: int = Field(..., ge=0, description="Amount in VND")
    merchant_name: Optional[str] = Field(None, max_length=255)
    transaction_date: Optional[datetime] = None
    note: Optional[str] = Field(None, max_length=500)
    is_life_log: bool = False


class TransactionUpdateRequest(BaseModel):
    """Request to update a transaction (human-in-the-loop edit)."""

    amount: Optional[int] = Field(None, ge=0, description="Amount in VND")
    category_id: Optional[UUID] = None
    wallet_id: Optional[UUID] = None
    note: Optional[str] = Field(None, max_length=500)
    merchant_name: Optional[str] = Field(None, max_length=255)


class TransactionListRequest(BaseModel):
    """Request to list transactions with filters."""

    wallet_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    skip: int = Field(0, ge=0)
    limit: int = Field(50, ge=1, le=100)
