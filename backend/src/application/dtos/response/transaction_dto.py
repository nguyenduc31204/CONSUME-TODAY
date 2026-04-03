"""
Response DTOs — Pydantic models for Transaction API responses.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TransactionResponse(BaseModel):
    """Response DTO for a Transaction entity."""

    id: UUID
    user_id: UUID
    wallet_id: UUID
    category_id: UUID | None = None
    image_url: str | None = None
    thumbnail_url: str | None = None
    merchant_name: str | None = None
    amount: int
    currency: str = "VND"
    transaction_date: datetime | None = None
    note: str | None = None
    ocr_confidence: float
    is_life_log: bool
    is_income: bool = False
    transaction_status: str = "pending"
    created_at: datetime
    updated_at: datetime
    # Denormalized for frontend convenience
    category_name: str | None = None
    wallet_name: str | None = None

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
    description: str | None = None
    color: str
    icon: str
    is_default: bool
    is_personal: bool
    balance: int
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
    avatar_url: str | None = None
    has_password: bool = False  # Computed: user.has_password()
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
