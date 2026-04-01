"""
Response DTOs — Pydantic models for Transaction API responses.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class TransactionResponse(BaseModel):
    """Response DTO for a Transaction entity."""

    id: UUID
    user_id: UUID
    wallet_id: UUID
    category_id: Optional[UUID] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    merchant_name: Optional[str] = None
    amount: int
    currency: str = "VND"
    transaction_date: Optional[datetime] = None
    note: Optional[str] = None
    ocr_confidence: float
    is_life_log: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    """Paginated list of transactions."""

    items: list[TransactionResponse]
    total: int
    page: int
    page_size: int


class WalletResponse(BaseModel):
    """Response DTO for a Wallet entity."""

    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    color: str
    icon: str
    is_default: bool
    is_personal: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CategoryResponse(BaseModel):
    """Response DTO for a Category entity."""

    id: UUID
    wallet_id: UUID
    name: str
    icon: str
    color: str
    emoji: str
    is_default: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    """Response DTO for a User entity."""

    id: UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
