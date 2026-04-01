"""
Transaction Routes — API endpoints for transactions.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.request.transaction_dto import TransactionUpdateRequest
from src.application.dtos.response.transaction_dto import TransactionResponse, TransactionListResponse
from src.infrastructure.adapters.driving.main import success_response
from src.infrastructure.adapters.driven.database import get_db

router = APIRouter()


# ── Stubs (Phase 2/3 full implementation) ─────────────────

@router.get("/transactions")
async def list_transactions(
    wallet_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    List transactions for authenticated user.
    TODO: Implement with user auth in Phase 2
    """
    # Placeholder response
    return success_response(
        data=TransactionListResponse(
            items=[],
            total=0,
            page=skip // limit + 1,
            page_size=limit,
        ).model_dump(),
        message="Transaction list endpoint",
    )


@router.get("/transactions/{transaction_id}", response_model=dict)
async def get_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single transaction by ID.
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="Get transaction not yet implemented")


@router.post("/transactions/upload")
async def upload_image(
    file: UploadFile = File(...),
    wallet_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Upload image → AI OCR → Create transaction → Auto-save.
    Core flow: capture expense with AI processing.

    TODO: Full implementation in Phase 3 (upload + Claude OCR + persistence)
    """
    raise HTTPException(status_code=501, detail="Image upload not yet implemented")


@router.patch("/transactions/{transaction_id}", response_model=dict)
async def update_transaction(
    transaction_id: UUID,
    request: TransactionUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update a transaction (human-in-the-loop edit).
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="Update transaction not yet implemented")


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Soft-delete a transaction.
    TODO: Implement in Phase 2
    """
    raise HTTPException(status_code=501, detail="Delete transaction not yet implemented")
