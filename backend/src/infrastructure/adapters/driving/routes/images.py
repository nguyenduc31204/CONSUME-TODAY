"""
Image Routes — Upload, retrieve, delete, and download images with R2 storage.
"""

from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, File, Header, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.image_dto import ImageResponse
from src.domain.entities.image import Image
from src.infrastructure.adapters.driven.database import get_db
from src.infrastructure.adapters.driven.image_repository_impl import ImageRepositoryImpl
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.adapters.driven.s3_storage import R2StorageAdapter
from src.infrastructure.shared.exceptions import ForbiddenException, NotFoundException
from src.infrastructure.shared.loguru_config import get_logger

logger = get_logger()

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_SIZE_MB = 10


def _get_user_id(authorization: str = Header(...)) -> UUID:
    if not authorization.startswith("Bearer "):
        raise ForbiddenException(message="Missing Bearer token.")
    token = authorization[7:]
    user_id = JWTService().verify_access_token(token)
    if user_id is None:
        raise ForbiddenException(message="Invalid access token.")
    return user_id


def _get_user_id_header_or_cookie(
    authorization: str | None = Header(None, alias="Authorization"),
    memoir_token: str | None = Cookie(None, alias="memoir_token"),
) -> UUID:
    raw_token = authorization or memoir_token
    if not raw_token:
        raise ForbiddenException(message="Missing authentication token.")
    if raw_token.startswith("Bearer "):
        raw_token = raw_token[7:]
    user_id = JWTService().verify_access_token(raw_token)
    if user_id is None:
        raise ForbiddenException(message="Invalid or expired token.")
    return user_id


@router.post("/images/upload")
async def upload_image(
    file: UploadFile = File(...),
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {ALLOWED_TYPES}",
        )

    contents = await file.read()
    file_size = len(contents)

    if file_size > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size is {MAX_SIZE_MB}MB.",
        )

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    storage = R2StorageAdapter()
    upload_result = await storage.upload_image(
        user_id=str(user_id),
        file_bytes=contents,
        filename=file.filename or "upload.jpg",
        mime_type=file.content_type,
    )

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
    repo = ImageRepositoryImpl(db)
    image = await repo.get_by_id(image_id)

    if image is None:
        raise NotFoundException(message="Image not found.")
    if image.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this image.")

    return {
        "success": True,
        "data": ImageResponse.model_validate(image).model_dump(),
        "message": "",
    }


@router.delete("/images/{image_id}")
async def delete_image(
    image_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    repo = ImageRepositoryImpl(db)
    image = await repo.get_by_id(image_id)

    if image is None:
        raise NotFoundException(message="Image not found.")
    if image.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this image.")

    await repo.soft_delete(image_id)
    await db.commit()

    if image.storage_key:
        try:
            storage = R2StorageAdapter()
            await storage.delete_image(image.storage_key)
        except Exception:
            pass

    return {"success": True, "data": None, "message": "Image deleted."}


@router.get("/images/{image_id}/download")
async def download_image(
    image_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Force-download an image with Content-Disposition: attachment.
    Works reliably on mobile Safari/iOS where fetch+blob approach fails.
    """
    repo = ImageRepositoryImpl(db)
    image = await repo.get_by_id(image_id)

    if image is None:
        raise NotFoundException(message="Image not found.")
    if image.user_id != user_id:
        raise ForbiddenException(message="You do not have access to this image.")

    storage = R2StorageAdapter()
    try:
        # Fetch raw bytes from R2
        bytes_data = await storage.get_object(image.storage_key)
    except Exception as exc:
        logger.error(f"Failed to fetch image {image_id} from R2: {exc}")
        raise NotFoundException(message="Image not found in storage.")

    filename = image.filename or f"memoir-{image_id}.jpg"
    content_type = image.mime_type or "image/jpeg"

    return Response(
        content=bytes_data,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(bytes_data)),
            "Cache-Control": "private, max-age=3600",
        },
    )
