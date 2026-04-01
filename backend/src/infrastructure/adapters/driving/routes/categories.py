"""
Category Routes — API endpoints for categories.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.transaction_dto import CategoryResponse
from src.infrastructure.adapters.driving.main import success_response
from src.infrastructure.adapters.driven.database import get_db

router = APIRouter()


class CategoryCreateRequest(BaseModel):
    name: str
    icon: str = "tag"
    color: str = "#9333EA"
    emoji: str = "🏷️"


# ── Stubs (Phase 2 full implementation) ────────────────────

@router.get("/categories", response_model=dict)
async def list_categories(
    wallet_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List all categories for a wallet.
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="List categories not yet implemented")


@router.get("/categories/{category_id}", response_model=dict)
async def get_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single category by ID.
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="Get category not yet implemented")


@router.post("/categories", response_model=dict)
async def create_category(
    request: CategoryCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a custom category.
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="Create category not yet implemented")


@router.patch("/categories/{category_id}", response_model=dict)
async def update_category(
    category_id: UUID,
    request: CategoryCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update a category.
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="Update category not yet implemented")


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Soft-delete (deactivate) a category.
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="Delete category not yet implemented")
