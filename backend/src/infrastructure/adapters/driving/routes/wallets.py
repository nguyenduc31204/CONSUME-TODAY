"""
Wallet Routes — Full CRUD for wallets with auth + owner validation.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.adapters.driven.database import get_db
from src.infrastructure.adapters.driven.wallet_repository_impl import WalletRepositoryImpl
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.shared.exceptions import ForbiddenException, NotFoundException
from src.application.use_cases.manage_wallet import ManageWalletUseCase
from src.application.dtos.response.transaction_dto import WalletResponse

router = APIRouter()


def _get_user_id(authorization: str = Header(...)) -> UUID:
    if not authorization.startswith("Bearer "):
        raise ForbiddenException(message="Missing Bearer token.")
    token = authorization[7:]
    user_id = JWTService().verify_access_token(token)
    if user_id is None:
        raise ForbiddenException(message="Invalid access token.")
    return user_id


def _get_wallet_uc(db: AsyncSession) -> ManageWalletUseCase:
    return ManageWalletUseCase(WalletRepositoryImpl(db))


# ── Request DTOs ─────────────────────────────────────────

class WalletCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#9333EA"
    icon: str = "wallet"


class WalletUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


# ── Routes ───────────────────────────────────────────────

@router.get("/wallets")
async def list_wallets(
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List all wallets for the authenticated user."""
    uc = _get_wallet_uc(db)
    wallets = await uc.list_wallets(user_id)
    return {
        "success": True,
        "data": [WalletResponse.model_validate(w).model_dump() for w in wallets],
        "message": "",
    }


@router.get("/wallets/{wallet_id}")
async def get_wallet(
    wallet_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get a single wallet by ID."""
    uc = _get_wallet_uc(db)
    try:
        wallet = await uc.get_wallet(wallet_id)
    except ValueError:
        raise NotFoundException(message="Wallet not found.")

    if wallet.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this wallet.")

    return {"success": True, "data": WalletResponse.model_validate(wallet).model_dump(), "message": ""}


@router.post("/wallets")
async def create_wallet(
    request: WalletCreateRequest,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new wallet for the authenticated user."""
    if len(request.name.strip()) == 0:
        raise HTTPException(status_code=422, detail="Wallet name cannot be empty.")

    uc = _get_wallet_uc(db)
    wallet = await uc.create_wallet(
        user_id=user_id,
        name=request.name,
        description=request.description,
        color=request.color,
        icon=request.icon,
    )
    return {
        "success": True,
        "data": WalletResponse.model_validate(wallet).model_dump(),
        "message": "Wallet created.",
    }


@router.patch("/wallets/{wallet_id}")
async def update_wallet(
    wallet_id: UUID,
    request: WalletUpdateRequest,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a wallet (owner only)."""
    uc = _get_wallet_uc(db)

    try:
        wallet = await uc.get_wallet(wallet_id)
    except ValueError:
        raise NotFoundException(message="Wallet not found.")

    if wallet.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this wallet.")

    updated = await uc.update_wallet(
        wallet_id=wallet_id,
        name=request.name,
        color=request.color,
        description=request.description,
    )
    return {"success": True, "data": WalletResponse.model_validate(updated).model_dump(), "message": "Wallet updated."}


@router.post("/wallets/{wallet_id}/set-default")
async def set_default_wallet(
    wallet_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Set a wallet as the user's default."""
    uc = _get_wallet_uc(db)

    try:
        wallet = await uc.get_wallet(wallet_id)
    except ValueError:
        raise NotFoundException(message="Wallet not found.")

    if wallet.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this wallet.")

    updated = await uc.set_default(wallet_id=wallet_id, user_id=user_id)
    return {"success": True, "data": WalletResponse.model_validate(updated).model_dump(), "message": "Default wallet set."}


@router.delete("/wallets/{wallet_id}")
async def delete_wallet(
    wallet_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a wallet (owner only)."""
    uc = _get_wallet_uc(db)

    try:
        wallet = await uc.get_wallet(wallet_id)
    except ValueError:
        raise NotFoundException(message="Wallet not found.")

    if wallet.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this wallet.")

    if wallet.is_default:
        raise ForbiddenException(message="Cannot delete the default wallet.")

    await uc.soft_delete_wallet(wallet_id)
    return {"success": True, "data": None, "message": "Wallet deleted."}
