"""
Wallet Routes — Full CRUD for wallets with auth + owner validation.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.transaction_dto import WalletResponse
from src.application.use_cases.manage_wallet import ManageWalletUseCase
from src.domain.entities.category import DEFAULT_CATEGORIES
from src.infrastructure.adapters.driven.category_repository_impl import (
    CategoryRepositoryImpl,
)
from src.infrastructure.adapters.driven.database import get_db
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.adapters.driven.wallet_repository_impl import (
    WalletRepositoryImpl,
)
from src.infrastructure.shared.exceptions import ForbiddenException, NotFoundException

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


def _get_category_repo(db: AsyncSession) -> CategoryRepositoryImpl:
    return CategoryRepositoryImpl(db)


# ── Request DTOs ─────────────────────────────────────────


class WalletCreateRequest(BaseModel):
    name: str
    description: str | None = None
    color: str = "#9333EA"
    icon: str = "wallet"
    initial_balance: int = 0


class WalletUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    icon: str | None = None


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

    return {
        "success": True,
        "data": WalletResponse.model_validate(wallet).model_dump(),
        "message": "",
    }


@router.post("/wallets")
async def create_wallet(
    request: WalletCreateRequest,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new wallet for the authenticated user. First wallet is auto-set as default with 6 categories."""
    if len(request.name.strip()) == 0:
        raise HTTPException(status_code=422, detail="Wallet name cannot be empty.")

    wallet_repo = WalletRepositoryImpl(db)
    existing = await wallet_repo.get_by_user_id(user_id)
    is_first = len(existing) == 0

    # Unset current default if this is not the first wallet
    if not is_first:
        current_default = next((w for w in existing if w.is_default), None)
        if current_default:
            current_default.unset_default()
            await wallet_repo.update(current_default)

    uc = _get_wallet_uc(db)
    wallet = await uc.create_wallet(
        user_id=user_id,
        name=request.name,
        description=request.description,
        color=request.color,
        icon=request.icon,
        initial_balance=request.initial_balance,
        is_default=is_first,
    )

    # Every new wallet gets the 6 default categories
    cat_repo = _get_category_repo(db)
    for cat_data in DEFAULT_CATEGORIES:
        from src.domain.entities.category import Category

        cat = Category(
            wallet_id=wallet.id,
            name=cat_data["name"],
            icon=cat_data["icon"],
            color=cat_data["color"],
            emoji=cat_data["emoji"],
            is_default=True,
        )
        await cat_repo.save(cat)

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
        icon=request.icon,
    )
    return {
        "success": True,
        "data": WalletResponse.model_validate(updated).model_dump(),
        "message": "Wallet updated.",
    }


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
    return {
        "success": True,
        "data": WalletResponse.model_validate(updated).model_dump(),
        "message": "Default wallet set.",
    }


class WalletAdjustBalanceRequest(BaseModel):
    amount: int  # positive = add income, negative = subtract


@router.post("/wallets/{wallet_id}/adjust-balance")
async def adjust_wallet_balance(
    wallet_id: UUID,
    request: WalletAdjustBalanceRequest,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Adjust a wallet's balance (add income or subtract expense)."""
    uc = _get_wallet_uc(db)

    try:
        wallet = await uc.get_wallet(wallet_id)
    except ValueError:
        raise NotFoundException(message="Wallet not found.")

    if wallet.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this wallet.")

    updated = await uc.adjust_balance(wallet_id=wallet_id, amount=request.amount)
    direction = "tăng" if request.amount >= 0 else "giảm"
    return {
        "success": True,
        "data": WalletResponse.model_validate(updated).model_dump(),
        "message": f"Số dư đã {direction} {abs(request.amount):,}đ",
    }


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
