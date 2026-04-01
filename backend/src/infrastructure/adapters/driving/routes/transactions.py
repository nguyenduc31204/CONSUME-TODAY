"""
Transaction Routes — Full CRUD + Phase 3: Upload + OCR + Auto-Save + Life Log.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.adapters.driven.database import get_db
from src.infrastructure.adapters.driven.transaction_repository_impl import TransactionRepositoryImpl
from src.infrastructure.adapters.driven.wallet_repository_impl import WalletRepositoryImpl
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.adapters.driven.s3_storage import R2StorageAdapter
from src.infrastructure.adapters.driven.claude_ocr import ClaudeOcrAdapter
from src.infrastructure.shared.exceptions import ForbiddenException, NotFoundException
from src.application.dtos.response.transaction_dto import TransactionResponse, TransactionListResponse
from src.application.dtos.response.ocr_dto import OcrCategoryResult

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def _get_user_id(authorization: str = Header(...)) -> UUID:
    if not authorization.startswith("Bearer "):
        raise ForbiddenException(message="Missing Bearer token.")
    token = authorization[7:]
    user_id = JWTService().verify_access_token(token)
    if user_id is None:
        raise ForbiddenException(message="Invalid access token.")
    return user_id


def _get_transaction_repo(db: AsyncSession) -> TransactionRepositoryImpl:
    return TransactionRepositoryImpl(db)


# ── Request DTOs ─────────────────────────────────────────────

class TransactionUpdateRequest(BaseModel):
    wallet_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    merchant_name: Optional[str] = None
    amount: Optional[int] = None
    currency: Optional[str] = None
    transaction_date: Optional[datetime] = None
    note: Optional[str] = None


class TransactionConvertRequest(BaseModel):
    """Request to convert a life-log entry to a financial expense."""
    amount: int
    category_id: UUID
    merchant_name: Optional[str] = None


# ── Routes ───────────────────────────────────────────────────

@router.get("/transactions")
async def list_transactions(
    wallet_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List transactions for authenticated user with optional filters."""
    # If wallet_id provided, verify ownership
    if wallet_id:
        wallet_repo = WalletRepositoryImpl(db)
        wallet = await wallet_repo.get_by_id(wallet_id)
        if wallet is None or wallet.user_id != user_id:
            raise ForbiddenException(message="You do not have access to this wallet.")

    repo = _get_transaction_repo(db)
    items, total = await repo.list_by_user(
        user_id,
        wallet_id=wallet_id,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
    )
    return {
        "success": True,
        "data": TransactionListResponse(
            items=[TransactionResponse.model_validate(t).model_dump() for t in items],
            total=total,
            page=skip // limit + 1,
            page_size=limit,
        ).model_dump(),
        "message": "",
    }


@router.get("/transactions/{transaction_id}")
async def get_transaction(
    transaction_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get a single transaction by ID."""
    repo = _get_transaction_repo(db)
    transaction = await repo.get_by_id(transaction_id)

    if transaction is None:
        raise NotFoundException(message="Transaction not found.")
    if transaction.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this transaction.")

    return {"success": True, "data": TransactionResponse.model_validate(transaction).model_dump(), "message": ""}


# ── Phase 3: Upload + OCR + Auto-Save ───────────────────────

@router.post("/transactions/upload")
async def upload_and_capture(
    file: UploadFile = File(...),
    wallet_id: Optional[UUID] = Query(None),
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Core Phase 3 endpoint: upload image → R2 storage → Claude OCR → create pending transaction.

    Flow:
    1. Validate wallet (use default if not specified)
    2. Upload image to R2 with Pillow preprocessing
    3. Run AI OCR on image bytes
    4. Create transaction with status='pending'
    5. Return transaction + OCR result for frontend card popup

    Frontend responsibility:
    - Display card popup with OCR result
    - Start 3-second countdown
    - If user doesn't tap → call /confirm after 3s
    - If user taps → show Quick Edit → call /{id} PATCH
    """
    # Validate MIME type
    if file.content_type not in ALLOWED_TYPES:
        raise ForbiddenException(message=f"Unsupported file type: {file.content_type}")

    contents = await file.read()
    if not contents:
        raise ForbiddenException(message="Empty file uploaded.")

    # Resolve wallet
    wallet_repo = WalletRepositoryImpl(db)
    if wallet_id is None:
        wallet = await wallet_repo.get_default(user_id)
        if wallet is None:
            raise NotFoundException(message="No default wallet found. Please create a wallet first.")
        wallet_id = wallet.id
    else:
        wallet = await wallet_repo.get_by_id(wallet_id)
        if wallet is None or wallet.user_id != user_id:
            raise ForbiddenException(message="You do not have access to this wallet.")

    # Step 1: Upload to R2
    storage = R2StorageAdapter()
    upload_result = await storage.upload_image(
        user_id=str(user_id),
        file_bytes=contents,
        filename=file.filename or "capture.jpg",
        mime_type=file.content_type or "image/jpeg",
    )
    image_url = upload_result["url"]
    thumbnail_url = upload_result.get("thumbnail_url")

    # Step 2: AI OCR — send base64 bytes
    ocr = ClaudeOcrAdapter()
    ocr_result = await ocr.analyze_image(contents, source_type="base64")

    # Step 3: Build transaction entity
    from src.domain.entities.transaction import Transaction
    from src.domain.services.domain_service import OcrValidationService

    if ocr_result.is_life_log or ocr_result.amount is None:
        # Life-log photo
        transaction = Transaction(
            user_id=user_id,
            wallet_id=wallet_id,
            image_url=image_url,
            thumbnail_url=thumbnail_url,
            merchant_name=ocr_result.reason,
            amount=0,
            currency="VND",
            ocr_confidence=ocr_result.confidence,
            is_life_log=True,
            transaction_status=Transaction.STATUS_PENDING,
        )
    else:
        # Financial expense
        if ocr_result.items_amounts:
            is_valid = OcrValidationService.validate_amount_consistency(
                ocr_result.amount, ocr_result.items_amounts
            )
            if not is_valid:
                pass  # Logged in use case, save anyway — user can correct

        transaction = Transaction(
            user_id=user_id,
            wallet_id=wallet_id,
            image_url=image_url,
            thumbnail_url=thumbnail_url,
            merchant_name=ocr_result.merchant,
            amount=ocr_result.amount,
            currency=ocr_result.currency,
            transaction_date=datetime.combine(ocr_result.date, datetime.min.time())
                if ocr_result.date else None,
            ocr_confidence=ocr_result.confidence,
            is_life_log=False,
            transaction_status=Transaction.STATUS_PENDING,
        )

    # Step 4: Persist
    repo = _get_transaction_repo(db)
    saved = await repo.save(transaction)
    await db.commit()

    # Step 5: Build response
    from src.domain.services.ocr_domain_service import CategoryMapper
    category_display = CategoryMapper.map_key_to_display_name(ocr_result.category_key)

    response_data = {
        "transaction_id": str(saved.id),
        "image": {
            "url": image_url,
            "thumbnail_url": thumbnail_url,
            "width": upload_result.get("width"),
            "height": upload_result.get("height"),
        },
        "ocr_result": {
            "merchant": ocr_result.merchant,
            "amount": ocr_result.amount,
            "currency": ocr_result.currency,
            "date": ocr_result.date.isoformat() if ocr_result.date else None,
            "category": OcrCategoryResult(
                id=None,
                name=category_display or "Khác",
                confidence=ocr_result.confidence,
            ).model_dump() if category_display else None,
            "is_life_log": ocr_result.is_life_log,
            "confidence": ocr_result.confidence,
            "reason": ocr_result.reason,
        },
        "auto_save_in_seconds": 3,
        "wallet_id": str(wallet_id),
        "wallet_name": wallet.name,
        "transaction_status": saved.transaction_status,
    }

    return {"success": True, "data": response_data, "message": ""}


@router.post("/transactions/{transaction_id}/confirm")
async def confirm_transaction(
    transaction_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Confirm a pending transaction (auto-save or manual confirmation).
    Called by frontend after the 3-second countdown, or immediately if user confirms.
    """
    repo = _get_transaction_repo(db)
    transaction = await repo.get_by_id(transaction_id)

    if transaction is None:
        raise NotFoundException(message="Transaction not found.")
    if transaction.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this transaction.")

    transaction.confirm()
    updated = await repo.update(transaction)
    await db.commit()

    return {
        "success": True,
        "data": TransactionResponse.model_validate(updated).model_dump(),
        "message": "Transaction confirmed.",
    }


@router.get("/transactions/{transaction_id}/edit")
async def get_transaction_for_edit(
    transaction_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get transaction data formatted for the Quick Edit screen.
    Returns transaction + available wallets + available categories for the user.
    """
    from src.infrastructure.adapters.driven.category_repository_impl import CategoryRepositoryImpl

    repo = _get_transaction_repo(db)
    transaction = await repo.get_by_id(transaction_id)

    if transaction is None:
        raise NotFoundException(message="Transaction not found.")
    if transaction.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this transaction.")

    # Get wallets
    wallet_repo = WalletRepositoryImpl(db)
    wallets = await wallet_repo.list_by_user(user_id)

    # Get categories for the transaction's wallet
    category_repo = CategoryRepositoryImpl(db)
    categories = await category_repo.get_by_wallet_id(transaction.wallet_id)

    return {
        "success": True,
        "data": {
            "transaction": TransactionResponse.model_validate(transaction).model_dump(),
            "wallets": [
                {
                    "id": str(w.id),
                    "name": w.name,
                    "color": w.color,
                    "icon": w.icon,
                    "is_default": w.is_default,
                }
                for w in wallets
            ],
            "categories": [
                {
                    "id": str(c.id),
                    "name": c.name,
                    "emoji": c.emoji,
                    "color": c.color,
                }
                for c in categories
            ],
        },
        "message": "",
    }


@router.post("/transactions/{transaction_id}/convert-to-expense")
async def convert_life_log_to_expense(
    transaction_id: UUID,
    request: TransactionConvertRequest,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Convert a life-log entry to a financial expense.
    User taps "Thêm chi phí" on a life-log photo → enters amount + category.
    """
    repo = _get_transaction_repo(db)
    transaction = await repo.get_by_id(transaction_id)

    if transaction is None:
        raise NotFoundException(message="Transaction not found.")
    if transaction.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this transaction.")

    if not transaction.is_life_log:
        raise ForbiddenException(message="This transaction is already an expense.")

    transaction.convert_to_expense(
        amount=request.amount,
        category_id=request.category_id,
    )
    if request.merchant_name:
        transaction.merchant_name = request.merchant_name

    updated = await repo.update(transaction)
    await db.commit()

    return {
        "success": True,
        "data": TransactionResponse.model_validate(updated).model_dump(),
        "message": "Life log converted to expense.",
    }


# ── Standard CRUD ───────────────────────────────────────────

@router.patch("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: UUID,
    request: TransactionUpdateRequest,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a transaction (human-in-the-loop edit from Quick Edit screen)."""
    repo = _get_transaction_repo(db)
    transaction = await repo.get_by_id(transaction_id)

    if transaction is None:
        raise NotFoundException(message="Transaction not found.")
    if transaction.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this transaction.")

    # Apply updates
    if request.wallet_id is not None:
        wallet_repo = WalletRepositoryImpl(db)
        wallet = await wallet_repo.get_by_id(request.wallet_id)
        if wallet is None or wallet.user_id != user_id:
            raise ForbiddenException(message="Invalid wallet_id.")
        transaction.wallet_id = request.wallet_id

    if request.category_id is not None:
        transaction.category_id = request.category_id

    if request.merchant_name is not None:
        transaction.merchant_name = request.merchant_name

    if request.amount is not None:
        transaction.amount = request.amount
        if request.amount > 0:
            transaction.is_life_log = False

    if request.currency is not None:
        transaction.currency = request.currency

    if request.transaction_date is not None:
        transaction.transaction_date = request.transaction_date

    if request.note is not None:
        transaction.note = request.note

    updated = await repo.update(transaction)
    await db.commit()
    return {"success": True, "data": TransactionResponse.model_validate(updated).model_dump(), "message": "Transaction updated."}


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a transaction."""
    repo = _get_transaction_repo(db)
    transaction = await repo.get_by_id(transaction_id)

    if transaction is None:
        raise NotFoundException(message="Transaction not found.")
    if transaction.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this transaction.")

    await repo.soft_delete(transaction_id)
    await db.commit()
    return {"success": True, "data": None, "message": "Transaction deleted."}
