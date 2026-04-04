"""
Users Routes — Profile, stats, avatar upload.
Phase 5: User stats endpoint for profile page.
Phase 6+: Profile edit (name, avatar_url) + avatar upload to R2.
"""

from datetime import datetime
from uuid import UUID

from src.infrastructure.shared.datetime_utils import utc_now

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.adapters.driven.database import get_db
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.shared.exceptions import ForbiddenException

router = APIRouter()

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_AVATAR_SIZE_MB = 5


def _get_user_id(authorization: str = Header(...)) -> str:
    """Extract user_id from Bearer token. Accepts str or UUID; always returns str."""
    if not authorization.startswith("Bearer "):
        raise ForbiddenException(message="Missing Bearer token.")
    token = authorization[7:]
    user_id = JWTService().verify_access_token(token)
    if user_id is None:
        raise ForbiddenException(message="Invalid access token.")
    if isinstance(user_id, str):
        return user_id
    return str(user_id)


def _uuid_param(user_id: str) -> UUID:
    """Convert user_id string to UUID, handling both types."""
    if isinstance(user_id, UUID):
        return user_id
    return UUID(str(user_id))


# ── DTOs ──────────────────────────────────────────────────────


class UserStats(BaseModel):
    total_transactions: int
    total_spent: int
    total_images: int


class UpdateProfileRequest(BaseModel):
    """Request body for updating user profile (name, avatar_url)."""

    name: str = Field(..., min_length=1, max_length=255)
    avatar_url: str | None = Field(None, max_length=500)


# ── Routes ──────────────────────────────────────────────────


@router.get("/users/me/stats", response_model=dict)
async def get_my_stats(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
):
    """Get spending stats for the current user."""
    from src.infrastructure.adapters.driven.database import ImageModel, TransactionModel

    uid = _uuid_param(user_id)

    txn_count_stmt = select(func.count(TransactionModel.id)).where(
        TransactionModel.user_id == uid, TransactionModel.deleted_at.is_(None)
    )
    total_transactions = int((await db.execute(txn_count_stmt)).scalar_one())

    spent_stmt = select(func.coalesce(func.sum(TransactionModel.amount), 0)).where(
        and_(
            TransactionModel.user_id == uid,
            TransactionModel.deleted_at.is_(None),
            TransactionModel.transaction_status == "confirmed",
            TransactionModel.is_life_log == False,  # noqa: E712
        )
    )
    total_spent = int((await db.execute(spent_stmt)).scalar_one())

    img_count_stmt = select(func.count(ImageModel.id)).where(
        ImageModel.user_id == uid, ImageModel.deleted_at.is_(None)
    )
    total_images = int((await db.execute(img_count_stmt)).scalar_one())

    return {
        "success": True,
        "data": UserStats(
            total_transactions=total_transactions,
            total_spent=total_spent,
            total_images=total_images,
        ).model_dump(),
        "message": "",
    }


@router.get("/users/me", response_model=dict)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
):
    """Get the current user's full profile."""
    from src.application.dtos.response.transaction_dto import UserResponse
    from src.infrastructure.adapters.driven.database import UserModel

    uid = _uuid_param(user_id)

    stmt = select(UserModel).where(
        UserModel.id == uid,
        UserModel.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    model = result.scalar_one_or_none()

    if model is None:
        return {"success": False, "data": None, "message": "User not found."}

    return {
        "success": True,
        "data": UserResponse(
            id=model.id,
            email=model.email,
            name=model.name,
            avatar_url=model.avatar_url,
            has_password=model.hashed_password is not None,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at,
        ).model_dump(),
        "message": "",
    }


@router.patch("/users/me", response_model=dict)
async def update_my_profile(
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
):
    """Update the current user's profile (name, avatar_url)."""
    from src.application.dtos.response.transaction_dto import UserResponse
    from src.infrastructure.adapters.driven.database import UserModel

    uid = _uuid_param(user_id)

    stmt = select(UserModel).where(
        UserModel.id == uid,
        UserModel.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    model = result.scalar_one_or_none()

    if model is None:
        return {"success": False, "data": None, "message": "User not found."}

    model.name = body.name
    if body.avatar_url is not None:
        model.avatar_url = body.avatar_url
    model.updated_at = utc_now()

    await db.commit()
    await db.refresh(model)

    return {
        "success": True,
        "data": UserResponse(
            id=model.id,
            email=model.email,
            name=model.name,
            avatar_url=model.avatar_url,
            has_password=model.hashed_password is not None,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at,
        ).model_dump(),
        "message": "Cập nhật hồ sơ thành công.",
    }


@router.post("/users/me/avatar", response_model=dict)
async def upload_avatar(
    file: UploadFile = File(...),
    user_id: str = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a user avatar → R2 (square-cropped, 256x256 JPEG).
    Deletes the previous avatar from R2 if it exists.
    """
    from src.application.dtos.response.transaction_dto import UserResponse
    from src.infrastructure.adapters.driven.database import UserModel
    from src.infrastructure.adapters.driven.s3_storage import R2StorageAdapter

    # Validate MIME type
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {ALLOWED_AVATAR_TYPES}",
        )

    # Read bytes
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(contents) > MAX_AVATAR_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413, detail=f"File too large. Max {MAX_AVATAR_SIZE_MB}MB."
        )

    uid = _uuid_param(user_id)

    # Load user model
    stmt = select(UserModel).where(
        UserModel.id == uid,
        UserModel.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    model = result.scalar_one_or_none()

    if model is None:
        raise HTTPException(status_code=404, detail="User not found.")

    # Upload new avatar to R2
    storage = R2StorageAdapter()
    upload_result = await storage.upload_avatar(
        user_id=str(uid),
        file_bytes=contents,
        filename=file.filename or "avatar.jpg",
    )

    # Delete old avatar from R2 (best-effort)
    old_key: str | None = model.avatar_storage_key
    if old_key:
        try:
            await storage.delete_avatar(old_key)
        except Exception:
            pass  # Non-critical

    # Persist
    model.avatar_url = upload_result["url"]
    model.avatar_storage_key = upload_result["storage_key"]
    model.updated_at = utc_now()

    await db.commit()
    await db.refresh(model)

    return {
        "success": True,
        "data": UserResponse(
            id=model.id,
            email=model.email,
            name=model.name,
            avatar_url=model.avatar_url,
            has_password=model.hashed_password is not None,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at,
        ).model_dump(),
        "message": "Ảnh đại diện đã được cập nhật.",
    }
