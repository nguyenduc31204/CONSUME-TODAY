"""
Image Routes — Upload, retrieve, and delete images with R2 storage.
"""

from concurrent.futures import ThreadPoolExecutor
from uuid import UUID

from botocore.exceptions import ClientError
from fastapi import APIRouter, Cookie, Depends, File, Header, HTTPException, UploadFile
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

_executor = ThreadPoolExecutor(max_workers=4)


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
    """
    Read JWT from Authorization header OR memoir_token cookie.
    <img> tags cannot send custom headers, so the frontend stores the token
    in a HttpOnly cookie and the browser automatically sends it with requests
    to the same origin.
    """
    raw_token = authorization or memoir_token
    if not raw_token:
        raise ForbiddenException(message="Missing authentication token.")
    if raw_token.startswith("Bearer "):
        raw_token = raw_token[7:]
    user_id = JWTService().verify_access_token(raw_token)
    if user_id is None:
        raise ForbiddenException(message="Invalid or expired token.")
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


@router.get("/images/proxy")
async def proxy_image(url: str):
    """
    Public proxy endpoint: browser → backend → R2.
    Accepts the full R2 image URL as ?url=... query param.
    No auth required — prevents 403 from R2 private buckets.
    Only allows our own R2 domain to prevent abuse.
    """
    # Extract R2 key from full URL (e.g. https://pub-xxx.r2.dev/images/abc.jpg → images/abc.jpg)
    r2_key = _extract_r2_key(url)
    if not r2_key:
        raise HTTPException(status_code=400, detail="Invalid R2 image URL.")

    # Path traversal guard
    if ".." in r2_key or r2_key.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path.")

    storage = R2StorageAdapter()
    image_bytes, content_type = await _fetch_image_bytes(storage, r2_key)

    from fastapi.responses import Response

    return Response(
        content=image_bytes,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": str(len(image_bytes)),
        },
    )


def _extract_r2_key(r2_url: str) -> str | None:
    """
    Extract R2 key path from a full R2 public URL.
    Only allows our configured R2_PUBLIC_URL domain (prevents SSRF/abuse).
    """
    settings = get_settings()
    allowed_host = settings.r2_public_url.replace("https://", "").replace("http://", "").rstrip("/")
    if not r2_url:
        return None
    try:
        from urllib.parse import urlparse
        parsed = urlparse(r2_url)
        # Whitelist: only allow our own R2 domain
        if parsed.hostname and allowed_host and parsed.hostname != allowed_host and not allowed_host.startswith(parsed.hostname):
            return None
        key = parsed.path.lstrip("/")
        return key if key else None
    except Exception:
        return None


async def _fetch_image_bytes(storage: R2StorageAdapter, path: str) -> tuple[bytes, str]:
    """Fetch image bytes from R2. Falls back to thumbnail on NoSuchKey."""
    loop = __import__("asyncio").get_running_loop()

    def _do() -> tuple[bytes, str]:
        try:
            response = storage.client.get_object(
                Bucket=storage.settings.r2_bucket_name,
                Key=path,
            )
            body = response["Body"].read()
            content_type = response.get("ContentType", "image/jpeg")
            return body, content_type
        except ClientError as e:
            code = e.response["Error"]["Code"]
            logger.warning(f"R2 get_object failed for '{path}': {code}")
            if code == "NoSuchKey":
                # Try thumbnail fallback: images/... → thumbnails/...
                if path.startswith("images/"):
                    thumb_path = "thumbnails/" + path[7:]
                    parts = thumb_path.rsplit(".", 1)
                    thumb_path = parts[0] + "_thumb.jpg"
                    try:
                        response = storage.client.get_object(
                            Bucket=storage.settings.r2_bucket_name,
                            Key=thumb_path,
                        )
                        body = response["Body"].read()
                        return body, "image/jpeg"
                    except ClientError:
                        pass  # Fall through to raise original
            elif code in ("InvalidArgument", "AccessDenied", "AuthorizationError"):
                raise HTTPException(
                    status_code=502,
                    detail=f"R2 bucket '{storage.settings.r2_bucket_name}' is private or credentials are invalid. "
                    f"Please enable public access at https://dash.cloudflare.com → R2 → Object Storage.",
                )
            raise

    return await loop.run_in_executor(_executor, _do)


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
