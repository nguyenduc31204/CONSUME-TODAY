"""
Image Routes — Upload, retrieve, and delete images with R2 storage.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Header, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.image import Image
from src.infrastructure.adapters.driven.database import get_db
from src.infrastructure.adapters.driven.image_repository_impl import ImageRepositoryImpl
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.adapters.driven.s3_storage import R2StorageAdapter
from src.infrastructure.shared.exceptions import ForbiddenException, NotFoundException
from src.application.dtos.response.image_dto import ImageResponse

router = APIRouter()


def _get_user_id(authorization: str = Header(...)) -> UUID:
    if not authorization.startswith("Bearer "):
        raise ForbiddenException(message="Missing Bearer token.")
    token = authorization[7:]
    user_id = JWTService().verify_access_token(token)
    if user_id is None:
        raise ForbiddenException(message="Invalid access token.")
    return user_id


ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_SIZE_MB = 10


@router.post("/images/upload")
async def upload_image(
    file: UploadFile = File(...),
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload an image → R2 storage (with Pillow preprocessing) → DB record.
    Returns image metadata including URL and thumbnail URL.
    """
    # Validate MIME type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {ALLOWED_TYPES}",
        )

    # Read file bytes
    contents = await file.read()
    file_size = len(contents)

    # Validate file size
    if file_size > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size is {MAX_SIZE_MB}MB.",
        )

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    # Upload to R2 with preprocessing
    storage = R2StorageAdapter()
    upload_result = await storage.upload_image(
        user_id=str(user_id),
        file_bytes=contents,
        filename=file.filename or "upload.jpg",
        mime_type=file.content_type,
    )

    # Save image record to DB
    image = Image(
        user_id=user_id,
        url=upload_result["url"],
        thumbnail_url=upload_result["thumbnail_url"],
        filename=file.filename or "upload.jpg",
        mime_type=upload_result["mime_type"],
        file_size=upload_result["file_size"],
        width=upload_result["width"],
        height=upload_result["height"],
    )
    # Persist the storage key for deletion
    image.storage_key = upload_result["storage_key"]  # type: ignore[attr-defined]

    repo = ImageRepositoryImpl(db)
    saved = await repo.save(image)
    await db.commit()

    return {
        "success": True,
        "data": ImageResponse.model_validate(saved).model_dump(),
        "message": "Image uploaded successfully.",
    }


@router.get("/images/{image_id}")
async def get_image(
    image_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get image metadata by ID."""
    repo = ImageRepositoryImpl(db)
    image = await repo.get_by_id(image_id)

    if image is None:
        raise NotFoundException(message="Image not found.")
    if image.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this image.")

    return {"success": True, "data": ImageResponse.model_validate(image).model_dump(), "message": ""}


@router.delete("/images/{image_id}")
async def delete_image(
    image_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Soft-delete image record + delete from R2.
    Does NOT delete the image if it's linked to a transaction (preserve data integrity).
    """
    repo = ImageRepositoryImpl(db)
    image = await repo.get_by_id(image_id)

    if image is None:
        raise NotFoundException(message="Image not found.")
    if image.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this image.")

    # Soft-delete in DB
    await repo.soft_delete(image_id)
    await db.commit()

    # Delete from R2 using the stored storage_key (best-effort)
    if image.storage_key:
        try:
            storage = R2StorageAdapter()
            await storage.delete_image(image.storage_key)
        except Exception:
            pass  # Don't fail if R2 delete fails

    return {"success": True, "data": None, "message": "Image deleted."}
