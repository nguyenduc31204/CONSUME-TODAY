"""
Transaction Routes — Full CRUD + Phase 3: Upload + OCR + Auto-Save + Life Log.
"""

from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.ocr_dto import OcrCategoryResult
from src.application.dtos.response.transaction_dto import (
    TransactionListResponse,
    TransactionResponse,
)
from src.config import get_settings
from src.domain.entities.transaction import Transaction
from src.domain.services.ocr_domain_service import CategoryMapper
from src.infrastructure.adapters.driven.category_repository_impl import (
    CategoryRepositoryImpl,
)
from src.infrastructure.adapters.driven.claude_ocr import ClaudeOcrAdapter
from src.infrastructure.adapters.driven.database import get_db
from src.infrastructure.adapters.driven.gemini_ocr import GeminiOcrAdapter
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.adapters.driven.s3_storage import R2StorageAdapter
from src.infrastructure.adapters.driven.transaction_repository_impl import (
    TransactionRepositoryImpl,
)
from src.infrastructure.adapters.driven.wallet_repository_impl import (
    WalletRepositoryImpl,
)
from src.infrastructure.shared.exceptions import ForbiddenException, NotFoundException

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


def _get_ocr_adapter():
    """Return the configured OCR adapter based on settings.ai_provider."""
    settings = get_settings()
    if settings.ai_provider == "gemini" and settings.google_gemini_api_key:
        return GeminiOcrAdapter()
    return ClaudeOcrAdapter()


async def _sync_wallet_balance(
    db: AsyncSession,
    wallet_id: UUID,
    delta: int,
) -> None:
    """
    Adjust wallet balance by delta (positive = add income, negative = subtract expense).
    Life-log transactions (amount=0) are skipped.
    """
    if delta == 0:
        return
    wallet_repo = WalletRepositoryImpl(db)
    wallet = await wallet_repo.get_by_id(wallet_id)
    if wallet is None:
        return
    wallet.adjust_balance(delta)
    await wallet_repo.update(wallet)


async def _build_name_cache(
    db: AsyncSession, user_id: UUID
) -> tuple[dict[UUID, str], dict[UUID, str]]:
    """Batch-load all wallet + category names for a user (avoids N+1)."""
    wallet_repo = WalletRepositoryImpl(db)
    category_repo = CategoryRepositoryImpl(db)
    wallets_list = await wallet_repo.get_by_user_id(user_id)
    wallets: dict[UUID, str] = {w.id: w.name for w in wallets_list}
    categories: dict[UUID, str] = {}
    for w_id in wallets:
        cat_list = await category_repo.get_by_wallet_id(w_id)
        for c in cat_list:
            categories[c.id] = c.name
    return wallets, categories


def _enrich_tx(t, wallets: dict[UUID, str], categories: dict[UUID, str]) -> dict:
    """Convert Transaction entity → dict with proxy image URLs + denormalized names."""
    d = TransactionResponse.model_validate(t).model_dump()
    d["image_url"] = _image_proxy_url(t.image_url)
    d["thumbnail_url"] = _image_proxy_url(t.thumbnail_url)
    d["wallet_name"] = wallets.get(t.wallet_id)
    d["category_name"] = categories.get(t.category_id) if t.category_id else None
    return d


def _image_proxy_url(r2_url: str | None) -> str | None:
    """
    Return R2 image URL as-is. R2 bucket is public so no proxy needed.
    """
    return r2_url


async def _resolve_category_id(
    category_key: str | None,
    wallet_id: UUID,
    db: AsyncSession,
) -> UUID | None:
    """
    Resolve AI OCR category_key (e.g. 'f_and_b') → Category entity UUID from the wallet.

    1. Map key → display name ('f_and_b' → 'Ăn uống')
    2. Find matching Category by wallet_id + name in DB
    Returns None if no matching category exists (user hasn't seeded categories yet).
    """
    if not category_key:
        return None

    display_name = CategoryMapper.map_key_to_display_name(category_key)
    if not display_name:
        return None

    display_name = display_name.strip()
    repo = CategoryRepositoryImpl(db)
    cats = await repo.get_by_wallet_id(wallet_id)

    for c in cats:
        if c.name.strip() == display_name:
            return c.id

    return None


# ── Request DTOs ─────────────────────────────────────────────


class TransactionUpdateRequest(BaseModel):
    wallet_id: UUID | None = None
    category_id: UUID | None = None
    merchant_name: str | None = None
    amount: int | None = None
    currency: str | None = None
    transaction_date: datetime | None = None
    note: str | None = None
    is_income: bool | None = (
        None  # True = income (adds balance), False/unset = expense (deducts)
    )


class TransactionConvertRequest(BaseModel):
    """Request to convert a life-log entry to a financial expense."""

    amount: int
    category_id: UUID
    merchant_name: str | None = None


# ── Routes ───────────────────────────────────────────────────


@router.get("/transactions")
async def list_transactions(
    wallet_id: UUID | None = None,
    category_id: UUID | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    status: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    List transactions for authenticated user with optional filters.

    date params (start_date / end_date) are YYYY-MM-DD strings in local time.
    - start_date: >= start of that day (local)
    - end_date:   <  start of next day (local)  → covers the entire end_date day

    DB stores all datetimes as UTC (datetime.utcnow()), so we convert
    local date strings to UTC-aware datetimes before querying.
    """
    _start: datetime | None = None
    _end: datetime | None = None

    if start_date:
        # "2026-04-02" → start of day local → convert to UTC for DB comparison
        import time

        local_naive = datetime.strptime(start_date, "%Y-%m-%d")
        local_offset_sec = time.timezone if time.daylight == 0 else time.altzone
        _start = local_naive - timedelta(seconds=local_offset_sec)

    if end_date:
        # "2026-04-02" → end of day local (23:59:59) → convert to UTC
        import time

        end_of_day_naive = datetime.strptime(end_date, "%Y-%m-%d").replace(
            hour=23, minute=59, second=59
        )
        local_offset_sec = time.timezone if time.daylight == 0 else time.altzone
        _end = end_of_day_naive - timedelta(seconds=local_offset_sec)

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
        start_date=_start,
        end_date=_end,
        skip=skip,
        limit=limit,
    )

    wallets, categories = await _build_name_cache(db, user_id)

    return {
        "success": True,
        "data": TransactionListResponse(
            items=[_enrich_tx(t, wallets, categories) for t in items],
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

    wallets, categories = await _build_name_cache(db, user_id)
    tx_data = _enrich_tx(transaction, wallets, categories)
    return {"success": True, "data": tx_data, "message": ""}


# ── Phase 3: Upload + OCR + Auto-Save ───────────────────────


@router.post("/transactions/upload")
async def upload_and_capture(
    file: UploadFile = File(...),
    wallet_id: UUID | None = Query(None),
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Core Phase 3 endpoint: upload image → R2 storage → Claude OCR → create pending transaction.

    Flow:
    1. Validate wallet (use default if not specified)
    2. Upload image to R2 with Pillow preprocessing
    3. Run AI OCR on image bytes
    4. Resolve AI category_key → Category UUID from wallet DB
    5. Create transaction with category_id set (if match found)
    6. Return transaction + OCR result for frontend card popup
    """
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
            raise NotFoundException(
                message="No default wallet found. Please create a wallet first."
            )
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

    # Step 2: AI OCR (Gemini or Claude based on settings)
    ocr = _get_ocr_adapter()
    ocr_result = await ocr.analyze_image(contents, source_type="base64")

    # Step 3: Resolve AI category → DB UUID
    category_id: UUID | None = None
    if not ocr_result.is_life_log and ocr_result.category_key:
        category_id = await _resolve_category_id(ocr_result.category_key, wallet_id, db)

    # Step 4: Build transaction entity
    from src.domain.entities.transaction import Transaction
    from src.domain.services.domain_service import OcrValidationService

    if ocr_result.is_life_log or ocr_result.amount is None:
        # Life logs: use today as transaction_date so they appear in today's feed
        transaction = Transaction(
            user_id=user_id,
            wallet_id=wallet_id,
            image_url=image_url,
            thumbnail_url=thumbnail_url,
            merchant_name=ocr_result.reason,
            amount=0,
            currency="VND",
            transaction_date=datetime.utcnow().replace(
                hour=0, minute=0, second=0, microsecond=0
            ),
            ocr_confidence=ocr_result.confidence,
            is_life_log=True,
            is_income=False,
            transaction_status=Transaction.STATUS_CONFIRMED,  # Auto-confirm: life logs show in feed immediately
            category_id=category_id,
        )
    else:
        if ocr_result.items_amounts:
            is_valid = OcrValidationService.validate_amount_consistency(
                ocr_result.amount, ocr_result.items_amounts
            )
            if not is_valid:
                pass  # Logged; save anyway — user can correct

        transaction = Transaction(
            user_id=user_id,
            wallet_id=wallet_id,
            image_url=image_url,
            thumbnail_url=thumbnail_url,
            merchant_name=ocr_result.merchant,
            amount=ocr_result.amount,
            currency=ocr_result.currency,
            transaction_date=(
                datetime.combine(ocr_result.date, datetime.min.time()).replace(
                    tzinfo=None
                )
                if ocr_result.date
                else datetime.utcnow().replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
            ),
            ocr_confidence=ocr_result.confidence,
            is_life_log=False,
            transaction_status=Transaction.STATUS_CONFIRMED,  # Auto-confirm: expense appears in reports immediately
            category_id=category_id,
        )

    # Step 5: Persist
    repo = _get_transaction_repo(db)
    saved = await repo.save(transaction)

    # Step 5b: Sync wallet balance (delta negative = expense; life-logs have delta=0 = no-op)
    await _sync_wallet_balance(db, wallet_id, -(saved.amount))

    # Note: commit is handled by get_db() dependency

    # Step 6: Build response with proxy image URLs
    category_display = CategoryMapper.map_key_to_display_name(ocr_result.category_key)
    ocr_category_id_str = str(category_id) if category_id else None

    response_data = {
        "transaction_id": str(saved.id),
        "image": {
            # Use proxy URLs so browser can access private R2 bucket
            "url": _image_proxy_url(image_url),
            "thumbnail_url": _image_proxy_url(thumbnail_url),
            "width": upload_result.get("width"),
            "height": upload_result.get("height"),
        },
        "ocr_result": {
            "merchant": ocr_result.merchant,
            "amount": ocr_result.amount,
            "currency": ocr_result.currency,
            "date": ocr_result.date.isoformat() if ocr_result.date else None,
            "note": ocr_result.note,
            "category": OcrCategoryResult(
                id=ocr_category_id_str,
                name=category_display or "Khác",
                confidence=ocr_result.confidence,
            ).model_dump()
            if category_display
            else None,
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

    If the transaction has no category_id yet but has OCR data, resolve the
    category now so confirmed transactions always have a category when available.
    """
    repo = _get_transaction_repo(db)
    transaction = await repo.get_by_id(transaction_id)

    if transaction is None:
        raise NotFoundException(message="Transaction not found.")
    if transaction.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this transaction.")

    # Auto-resolve category at confirm time if not set (handles race between upload and DB seeding)
    if transaction.category_id is None and not transaction.is_life_log:
        ocr_key = None
        # Try to get category_key from OCR data stored in note or merchant
        # We stored ocr_confidence so we know OCR ran; try merchant-based suggestion
        if transaction.merchant_name:
            ocr_key = CategoryMapper.suggest_category_key(transaction.merchant_name)
        if ocr_key:
            resolved = await _resolve_category_id(ocr_key, transaction.wallet_id, db)
            if resolved:
                transaction.category_id = resolved

    transaction.confirm()
    updated = await repo.update(transaction)

    # Deduct wallet balance for confirmed expense (was skipped when saved as pending)
    if updated.amount > 0:
        await _sync_wallet_balance(db, updated.wallet_id, -updated.amount)

    # Note: commit is handled by get_db() dependency
    wallets, categories = await _build_name_cache(db, user_id)
    tx_data = _enrich_tx(updated, wallets, categories)
    return {
        "success": True,
        "data": tx_data,
        "message": "Transaction confirmed.",
    }


def _apply_proxy_urls(tx_response: dict) -> dict:
    """Convert R2 URLs to proxy URLs in a transaction response dict."""
    tx_response["image_url"] = _image_proxy_url(tx_response.get("image_url"))
    tx_response["thumbnail_url"] = _image_proxy_url(tx_response.get("thumbnail_url"))
    return tx_response


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
    repo = _get_transaction_repo(db)
    transaction = await repo.get_by_id(transaction_id)

    if transaction is None:
        raise NotFoundException(message="Transaction not found.")
    if transaction.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this transaction.")

    wallet_repo = WalletRepositoryImpl(db)
    wallets = await wallet_repo.get_by_user_id(user_id)
    all_wallets = {w.id: w.name for w in wallets}

    category_repo = CategoryRepositoryImpl(db)
    categories = await category_repo.get_by_user_id(user_id)
    all_categories = {c.id: c.name for c in categories}

    tx_dict = _enrich_tx(transaction, all_wallets, all_categories)

    return {
        "success": True,
        "data": {
            "transaction": tx_dict,
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
    transaction.is_income = False
    if request.merchant_name:
        transaction.merchant_name = request.merchant_name

    updated = await repo.update(transaction)

    # Deduct balance for the new expense (life log had amount=0)
    await _sync_wallet_balance(db, updated.wallet_id, -updated.amount)

    # Note: commit is handled by get_db() dependency
    wallets, categories = await _build_name_cache(db, user_id)
    tx_data = _enrich_tx(updated, wallets, categories)
    return {
        "success": True,
        "data": tx_data,
        "message": "Life log converted to expense.",
    }


# M─ Income (receive money) ───────────────────────────────


class TransactionIncomeRequest(BaseModel):
    amount: int
    wallet_id: UUID | None = None
    note: str | None = None


@router.post("/transactions/{transaction_id}/add-income")
async def add_income_to_life_log(
    transaction_id: UUID,
    request: TransactionIncomeRequest,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Add income to a life-log entry (e.g. received salary/payment on this day).
    Creates an expense transaction with amount > 0, then adds balance back (+amount).
    This effectively records money received: wallet.balance += amount.
    """
    repo = _get_transaction_repo(db)
    transaction = await repo.get_by_id(transaction_id)

    if transaction is None:
        raise NotFoundException(message="Transaction not found.")
    if transaction.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this transaction.")

    # Resolve target wallet
    target_wallet_id = request.wallet_id or transaction.wallet_id
    wallet_repo = WalletRepositoryImpl(db)
    wallet = await wallet_repo.get_by_id(target_wallet_id)
    if wallet is None or wallet.user_id != user_id:
        raise ForbiddenException(message="Invalid wallet.")

    # Build a new transaction representing the income
    income_tx = Transaction(
        user_id=user_id,
        wallet_id=target_wallet_id,
        image_url=transaction.image_url,
        thumbnail_url=transaction.thumbnail_url,
        merchant_name=transaction.merchant_name or "Thu nhập",
        amount=request.amount,
        currency="VND",
        transaction_date=transaction.transaction_date,
        note=request.note or "Thu nhập",
        ocr_confidence=0.0,
        is_life_log=False,
        is_income=True,
        transaction_status=Transaction.STATUS_CONFIRMED,
        category_id=None,
    )
    saved = await repo.save(income_tx)

    # Add balance to wallet (income = positive delta)
    await _sync_wallet_balance(db, target_wallet_id, request.amount)

    # Note: commit is handled by get_db() dependency
    wallets, categories = await _build_name_cache(db, user_id)
    tx_data = _enrich_tx(saved, wallets, categories)
    return {
        "success": True,
        "data": tx_data,
        "message": f"Đã ghi nhận thu nhập {request.amount:,}đ vào ví {wallet.name}.",
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

    # Capture old values for balance adjustment
    old_wallet_id = transaction.wallet_id
    old_amount = transaction.amount
    old_is_income = transaction.is_income

    if request.wallet_id is not None:
        wallet_repo = WalletRepositoryImpl(db)
        wallet = await wallet_repo.get_by_id(request.wallet_id)
        if wallet is None or wallet.user_id != user_id:
            raise ForbiddenException(message="Invalid wallet_id.")
        transaction.wallet_id = request.wallet_id

    if request.category_id is not None:
        # null → clear category; UUID → set category
        transaction.category_id = request.category_id

    if request.merchant_name is not None:
        transaction.merchant_name = request.merchant_name

    if request.amount is not None:
        transaction.amount = request.amount
        if request.amount > 0:
            transaction.is_life_log = False

    if request.is_income is not None:
        transaction.is_income = request.is_income

    if request.currency is not None:
        transaction.currency = request.currency

    if request.transaction_date is not None:
        td = request.transaction_date
        transaction.transaction_date = td.replace(tzinfo=None) if td.tzinfo else td

    if request.note is not None:
        transaction.note = request.note

    updated = await repo.update(transaction)

    # Sync wallet balance(s)
    # Expense: deducted (delta = -amount) → to reverse: add amount
    # Income: added (delta = +amount) → to reverse: subtract amount
    old_delta = old_amount if not old_is_income else -old_amount
    new_delta = -updated.amount if not updated.is_income else updated.amount

    if old_wallet_id == updated.wallet_id:
        # Same wallet: net delta = old reversal + new application
        delta = old_delta + new_delta
        await _sync_wallet_balance(db, updated.wallet_id, delta)
    else:
        # Different wallet: reverse old on old wallet, apply new on new wallet
        await _sync_wallet_balance(db, old_wallet_id, -old_delta)
        await _sync_wallet_balance(db, updated.wallet_id, new_delta)

    # Note: commit is handled by get_db() dependency
    wallets, categories = await _build_name_cache(db, user_id)
    tx_data = _enrich_tx(updated, wallets, categories)
    return {"success": True, "data": tx_data, "message": "Transaction updated."}


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

    wallet_id = transaction.wallet_id
    amount = transaction.amount
    is_income = transaction.is_income

    await repo.soft_delete(transaction_id)

    # Reverse wallet balance
    # Expense: was deducted (-amount), reverse = +amount (add back)
    # Income: was added (+amount), reverse = -amount (subtract back)
    delta = amount if not is_income else -amount
    await _sync_wallet_balance(db, wallet_id, delta)

    # Note: commit is handled by get_db() dependency
    return {"success": True, "data": None, "message": "Transaction deleted."}
