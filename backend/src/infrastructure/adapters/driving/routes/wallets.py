"""
Wallet Routes — API endpoints for wallets.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.transaction_dto import WalletResponse
from src.infrastructure.adapters.driving.main import success_response
from src.infrastructure.adapters.driven.database import get_db

router = APIRouter()


class WalletCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#9333EA"
    icon: str = "wallet"


# ── Stubs (Phase 2 full implementation) ─────────────────────

@router.get("/wallets", response_model=dict)
async def list_wallets(
    db: AsyncSession = Depends(get_db),
):
    """
    List all wallets for authenticated user.
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="List wallets not yet implemented")


@router.get("/wallets/{wallet_id}", response_model=dict)
async def get_wallet(
    wallet_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single wallet by ID.
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="Get wallet not yet implemented")


@router.post("/wallets", response_model=dict)
async def create_wallet(
    request: WalletCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new wallet.
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="Create wallet not yet implemented")


@router.patch("/wallets/{wallet_id}", response_model=dict)
async def update_wallet(
    wallet_id: UUID,
    request: WalletCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update a wallet.
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="Update wallet not yet implemented")


@router.post("/wallets/{wallet_id}/set-default", response_model=dict)
async def set_default_wallet(
    wallet_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Set a wallet as the user's default.
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="Set default wallet not yet implemented")


@router.delete("/wallets/{wallet_id}")
async def delete_wallet(
    wallet_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Soft-delete a wallet.
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="Delete wallet not yet implemented")
