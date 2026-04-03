"""
Category Routes — Full CRUD for categories with auth + wallet owner validation.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.transaction_dto import CategoryResponse
from src.application.use_cases.manage_category import ManageCategoryUseCase
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


def _get_category_uc(db: AsyncSession) -> ManageCategoryUseCase:
    return ManageCategoryUseCase(CategoryRepositoryImpl(db))


# ── Request DTOs ─────────────────────────────────────────


class CategoryCreateRequest(BaseModel):
    wallet_id: UUID | None = None  # uses default wallet if not provided
    name: str
    icon: str = "tag"
    color: str = "#9333EA"
    emoji: str = "🏷️"


class CategoryUpdateRequest(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None
    emoji: str | None = None


# ── Routes ───────────────────────────────────────────────


@router.get("/categories")
async def list_categories(
    wallet_id: UUID | None = None,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    List categories for a wallet, or all categories for the user if no wallet_id.
    """
    cat_repo = CategoryRepositoryImpl(db)

    if wallet_id is None:
        # Return all categories across all user's wallets
        categories = await cat_repo.get_by_user_id(user_id)
    else:
        # Verify wallet ownership
        wallet_repo = WalletRepositoryImpl(db)
        wallet = await wallet_repo.get_by_id(wallet_id)
        if wallet is None:
            raise NotFoundException(message="Wallet not found.")
        if wallet.user_id != user_id:
            raise ForbiddenException(message="You do not have access to this wallet.")
        categories = await cat_repo.get_by_wallet_id(wallet_id)

    return {
        "success": True,
        "data": [CategoryResponse.model_validate(c).model_dump() for c in categories],
        "message": "",
    }


@router.get("/categories/{category_id}")
async def get_category(
    category_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get a single category by ID."""
    uc = _get_category_uc(db)
    try:
        category = await uc.get_category(category_id)
    except ValueError:
        raise NotFoundException(message="Category not found.")

    # Verify wallet ownership
    wallet_repo = WalletRepositoryImpl(db)
    wallet = await wallet_repo.get_by_id(category.wallet_id)
    if wallet is None or wallet.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this category.")

    return {
        "success": True,
        "data": CategoryResponse.model_validate(category).model_dump(),
        "message": "",
    }


@router.post("/categories")
async def create_category(
    request: CategoryCreateRequest,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a custom category for a wallet (uses default wallet if wallet_id not provided)."""
    if len(request.name.strip()) == 0:
        raise HTTPException(status_code=422, detail="Category name cannot be empty.")

    wallet_repo = WalletRepositoryImpl(db)
    if request.wallet_id is None:
        wallet = await wallet_repo.get_default(user_id)
        if wallet is None:
            raise NotFoundException(
                message="No wallet found. Please create a wallet first."
            )
    else:
        wallet = await wallet_repo.get_by_id(request.wallet_id)
        if wallet is None:
            raise NotFoundException(message="Wallet not found.")
        if wallet.user_id != user_id:
            raise ForbiddenException(message="You do not have access to this wallet.")

    uc = _get_category_uc(db)
    category = await uc.create_category(
        wallet_id=wallet.id,
        name=request.name,
        icon=request.icon,
        color=request.color,
        emoji=request.emoji,
    )
    return {
        "success": True,
        "data": CategoryResponse.model_validate(category).model_dump(),
        "message": "Category created.",
    }


@router.patch("/categories/{category_id}")
async def update_category(
    category_id: UUID,
    request: CategoryUpdateRequest,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a category (owner only)."""
    uc = _get_category_uc(db)

    try:
        category = await uc.get_category(category_id)
    except ValueError:
        raise NotFoundException(message="Category not found.")

    # Verify wallet ownership
    wallet_repo = WalletRepositoryImpl(db)
    wallet = await wallet_repo.get_by_id(category.wallet_id)
    if wallet is None or wallet.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this category.")

    # Default categories cannot be renamed/deleted
    if (
        category.is_default
        and request.name is not None
        and request.name != category.name
    ):
        raise ForbiddenException(message="Cannot rename a default category.")

    updated = await uc.update_category(
        category_id=category_id,
        name=request.name,
        icon=request.icon,
        color=request.color,
        emoji=request.emoji,
    )
    return {
        "success": True,
        "data": CategoryResponse.model_validate(updated).model_dump(),
        "message": "Category updated.",
    }


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete (deactivate) a custom category."""
    uc = _get_category_uc(db)

    try:
        category = await uc.get_category(category_id)
    except ValueError:
        raise NotFoundException(message="Category not found.")

    # Verify wallet ownership
    wallet_repo = WalletRepositoryImpl(db)
    wallet = await wallet_repo.get_by_id(category.wallet_id)
    if wallet is None or wallet.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this category.")

    if category.is_default:
        raise ForbiddenException(message="Cannot delete a default category.")

    await uc.soft_delete_category(category_id)
    return {"success": True, "data": None, "message": "Category deleted."}
