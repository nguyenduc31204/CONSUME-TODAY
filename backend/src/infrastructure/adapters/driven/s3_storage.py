"""
S3/R2 Storage Adapter — Driven adapter for Cloudflare R2 object storage.
Implements IStoragePort with async boto3 + Pillow preprocessing.

Storage key conventions:
  images/{user_id}/{uuid}.{ext}
  thumbnails/{user_id}/{uuid}_thumb.jpg
"""

import hashlib
import io
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from uuid import uuid4

import boto3
from PIL import Image as PILImage

from src.config import get_settings
from src.infrastructure.shared.loguru_config import get_logger

logger = get_logger()

# ── Preprocessing constants ─────────────────────────────────

MAX_DIMENSION = 2000  # max width or height in pixels
THUMBNAIL_SIZE = (400, 400)  # max width, height for thumbnail
TARGET_SIZE_KB = 500  # compress to ~500 KB max
CHUNK_SIZE = 64 * 1024  # 64 KB chunks for progressive saving

_executor = ThreadPoolExecutor(max_workers=4)


def _preprocess_image(raw_bytes: bytes) -> tuple[bytes, int, int]:
    """
    Preprocess image for OCR and storage:
    - Open with Pillow
    - Resize if larger than MAX_DIMENSION
    - Auto-orient using EXIF
    - Convert to JPEG
    - Compress to TARGET_SIZE_KB
    Returns: (compressed_bytes, width, height)
    """
    img = PILImage.open(io.BytesIO(raw_bytes))

    # Auto-orient using EXIF Orientation tag (0x0112)
    try:
        exif = img.getexif()
        orientation = exif.get(0x0112)
        if orientation == 2:
            img = img.transpose(PILImage.FLIP_LEFT_RIGHT)
        elif orientation == 3:
            img = img.rotate(180, expand=True)
        elif orientation == 4:
            img = img.transpose(PILImage.FLIP_TOP_BOTTOM)
        elif orientation == 5:
            img = img.transpose(PILImage.FLIP_LEFT_RIGHT).rotate(90, expand=True)
        elif orientation == 6:
            img = img.rotate(270, expand=True)
        elif orientation == 7:
            img = img.transpose(PILImage.FLIP_LEFT_RIGHT).rotate(270, expand=True)
        elif orientation == 8:
            img = img.rotate(90, expand=True)
    except Exception:
        pass  # No EXIF or orientation — skip

    # Resize if needed
    width, height = img.size
    if max(width, height) > MAX_DIMENSION:
        ratio = MAX_DIMENSION / max(width, height)
        new_width = int(width * ratio)
        new_height = int(height * ratio)
        img = img.resize((new_width, new_height), PILImage.LANCZOS)
        width, height = new_width, new_height

    # Convert to RGB (handles RGBA, palette, etc.)
    if img.mode in ("RGBA", "P", "LA"):
        rgb = PILImage.new("RGB", img.size, (255, 255, 255))
        rgb.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
        img = rgb
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Compress to TARGET_SIZE_KB via progressive JPEG
    quality = 85
    output = io.BytesIO()
    img.save(output, format="JPEG", quality=quality, optimize=True)
    compressed = output.getvalue()

    # Reduce quality until under target size
    while len(compressed) > TARGET_SIZE_KB * 1024 and quality > 40:
        quality -= 5
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=quality, optimize=True)
        compressed = output.getvalue()

    return compressed, width, height


def _generate_thumbnail(raw_bytes: bytes) -> tuple[bytes, int, int]:
    """Generate a square thumbnail from image bytes."""
    img = PILImage.open(io.BytesIO(raw_bytes))

    # Auto-orient (same logic as _preprocess_image)
    try:
        exif = img.getexif()
        orientation = exif.get(0x0112)
        if orientation in (2, 5, 7):
            img = img.transpose(PILImage.FLIP_LEFT_RIGHT)
        elif orientation == 3:
            img = img.rotate(180, expand=True)
        elif orientation in (4, 6):
            img = img.rotate(270 if orientation == 6 else 180, expand=True)
        elif orientation == 8:
            img = img.rotate(90, expand=True)
    except Exception:
        pass

    # Convert to RGB
    if img.mode in ("RGBA", "P", "LA"):
        rgb = PILImage.new("RGB", img.size, (255, 255, 255))
        rgb.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
        img = rgb
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Resize to thumbnail size (maintain aspect, fit inside box)
    img.thumbnail(THUMBNAIL_SIZE, PILImage.LANCZOS)
    width, height = img.size

    # Save as progressive JPEG
    output = io.BytesIO()
    img.save(output, format="JPEG", quality=75, optimize=True)
    return output.getvalue(), width, height


def ext_from_mime(mime_type: str) -> str:
    """Map MIME type to file extension."""
    mapping = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
    }
    return mapping.get(mime_type, "jpg")


# ── Storage Adapter ──────────────────────────────────────────


class R2StorageAdapter:
    """
    Cloudflare R2 (S3-compatible) storage adapter.
    Uses boto3 with S3-compatible endpoint configuration.
    Async-safe via ThreadPoolExecutor.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = None

    @property
    def client(self):
        """Lazy initialization of boto3 S3 client."""
        if self._client is None:
            self._client = boto3.client(
                "s3",
                endpoint_url=f"https://{self.settings.r2_account_id}.r2.cloudflarestorage.com",
                aws_access_key_id=self.settings.r2_access_key_id,
                aws_secret_access_key=self.settings.r2_secret_access_key,
                region_name="auto",
            )
        return self._client

    def _generate_key(self, user_id: str, filename: str) -> str:
        """Generate a unique storage key for the file."""
        timestamp = datetime.utcnow().strftime("%Y/%m")
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
        unique_id = hashlib.sha256(str(uuid4()).encode()).hexdigest()[:16]
        return f"images/{user_id}/{timestamp}/{unique_id}.{ext}"

    def _generate_thumbnail_key(self, original_key: str) -> str:
        """Generate thumbnail key from original key."""
        # images/user_id/2026/04/abc.jpg → thumbnails/user_id/2026/04/abc_thumb.jpg
        parts = original_key.split("/")
        parts[0] = "thumbnails"
        filename = parts[-1]
        name_without_ext = filename.rsplit(".", 1)[0]
        parts[-1] = f"{name_without_ext}_thumb.jpg"
        return "/".join(parts)

    async def upload_image(
        self,
        user_id: str,
        file_bytes: bytes,
        filename: str,
        mime_type: str = "image/jpeg",
    ) -> dict:
        """
        Upload image to R2 with Pillow preprocessing.
        Returns dict with url, thumbnail_url, width, height, file_size.
        """
        loop = __import__("asyncio").get_running_loop()

        # Preprocess in thread pool (blocking Pillow in async context)
        preprocessed_bytes, width, height = await loop.run_in_executor(
            _executor, _preprocess_image, file_bytes
        )

        original_key = self._generate_key(user_id, filename)
        thumbnail_key = self._generate_thumbnail_key(original_key)

        # Upload original in thread pool
        def _upload_original():
            self.client.put_object(
                Bucket=self.settings.r2_bucket_name,
                Key=original_key,
                Body=preprocessed_bytes,
                ContentType="image/jpeg",
                CacheControl="public, max-age=31536000",
            )

        await loop.run_in_executor(_executor, _upload_original)

        # Generate and upload thumbnail
        thumb_bytes, thumb_w, thumb_h = await loop.run_in_executor(
            _executor, _generate_thumbnail, preprocessed_bytes
        )

        def _upload_thumbnail():
            self.client.put_object(
                Bucket=self.settings.r2_bucket_name,
                Key=thumbnail_key,
                Body=thumb_bytes,
                ContentType="image/jpeg",
                CacheControl="public, max-age=31536000",
            )

        await loop.run_in_executor(_executor, _upload_thumbnail)

        original_url = f"{self.settings.r2_public_url}/{original_key}"
        thumbnail_url = f"{self.settings.r2_public_url}/{thumbnail_key}"

        logger.info(
            f"Image uploaded: {original_key} ({len(preprocessed_bytes)//1024}KB, "
            f"{width}x{height}); thumbnail: {thumb_w}x{thumb_h}"
        )

        return {
            "url": original_url,
            "thumbnail_url": thumbnail_url,
            "width": width,
            "height": height,
            "file_size": len(preprocessed_bytes),
            "mime_type": "image/jpeg",
            "storage_key": original_key,
        }

    async def delete_image(self, storage_key: str) -> None:
        """Delete an image and its thumbnail from R2."""
        loop = __import__("asyncio").get_running_loop()

        def _do():
            self.client.delete_object(
                Bucket=self.settings.r2_bucket_name,
                Key=storage_key,
            )
            # Also delete thumbnail
            thumb_key = self._generate_thumbnail_key(storage_key)
            self.client.delete_object(
                Bucket=self.settings.r2_bucket_name,
                Key=thumb_key,
            )

        await loop.run_in_executor(_executor, _do)
        logger.info(f"Image deleted: {storage_key}")

    async def get_presigned_url(self, storage_key: str, expires_in: int = 3600) -> str:
        """Generate a presigned URL for direct client upload."""
        loop = __import__("asyncio").get_running_loop()

        def _do():
            return self.client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.settings.r2_bucket_name,
                    "Key": storage_key,
                    "ContentType": "image/jpeg",
                },
                ExpiresIn=expires_in,
            )

        return await loop.run_in_executor(_executor, _do)

    async def get_presigned_get_url(self, storage_key: str, expires_in: int = 3600) -> str:
        """Generate a presigned GET URL for public access to private R2 objects."""
        loop = __import__("asyncio").get_running_loop()

        def _do():
            return self.client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.settings.r2_bucket_name,
                    "Key": storage_key,
                },
                ExpiresIn=expires_in,
            )

        return await loop.run_in_executor(_executor, _do)

    async def get_object(self, storage_key: str) -> bytes:
        """Get image bytes from R2 (used by image proxy endpoint)."""
        loop = __import__("asyncio").get_running_loop()

        def _do() -> bytes:
            response = self.client.get_object(
                Bucket=self.settings.r2_bucket_name,
                Key=storage_key,
            )
            return response["Body"].read()

        return await loop.run_in_executor(_executor, _do)

    async def get_content_type(self, storage_key: str) -> str:
        """Get Content-Type header for a stored object."""
        loop = __import__("asyncio").get_running_loop()

        def _do() -> str:
            response = self.client.head_object(
                Bucket=self.settings.r2_bucket_name,
                Key=storage_key,
            )
            return response.get("ContentType", "image/jpeg")

        return await loop.run_in_executor(_executor, _do)

    async def upload_avatar(
        self,
        user_id: str,
        file_bytes: bytes,
        filename: str,
    ) -> dict:
        """
        Upload a user avatar to R2.
        - Crops to square (center-crop)
        - Resizes to 256x256 (small, fast-loading)
        - Converts to JPEG
        Returns dict with url and storage_key.
        """
        loop = __import__("asyncio").get_running_loop()

        def _process():
            img = PILImage.open(io.BytesIO(file_bytes))

            # Auto-orient
            try:
                exif = img.getexif()
                orientation = exif.get(0x0112)
                if orientation == 2:
                    img = img.transpose(PILImage.FLIP_LEFT_RIGHT)
                elif orientation == 3:
                    img = img.rotate(180, expand=True)
                elif orientation == 4:
                    img = img.transpose(PILImage.FLIP_TOP_BOTTOM)
                elif orientation == 5:
                    img = img.transpose(PILImage.FLIP_LEFT_RIGHT).rotate(
                        90, expand=True
                    )
                elif orientation == 6:
                    img = img.rotate(270, expand=True)
                elif orientation == 7:
                    img = img.transpose(PILImage.FLIP_LEFT_RIGHT).rotate(
                        270, expand=True
                    )
                elif orientation == 8:
                    img = img.rotate(90, expand=True)
            except Exception:
                pass

            # Square center-crop
            width, height = img.size
            min_dim = min(width, height)
            left = (width - min_dim) // 2
            top = (height - min_dim) // 2
            img = img.crop((left, top, left + min_dim, top + min_dim))

            # Convert to RGB
            if img.mode in ("RGBA", "P", "LA"):
                rgb = PILImage.new("RGB", img.size, (255, 255, 255))
                rgb.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
                img = rgb
            elif img.mode != "RGB":
                img = img.convert("RGB")

            # Resize to 256x256
            img = img.resize((256, 256), PILImage.LANCZOS)

            # Save as JPEG
            output = io.BytesIO()
            img.save(output, format="JPEG", quality=80, optimize=True)
            return output.getvalue()

        avatar_bytes = await loop.run_in_executor(_executor, _process)

        # Generate key: avatars/user_id/avatar.jpg (always overwrite)
        storage_key = f"avatars/{user_id}/avatar.jpg"

        def _upload():
            self.client.put_object(
                Bucket=self.settings.r2_bucket_name,
                Key=storage_key,
                Body=avatar_bytes,
                ContentType="image/jpeg",
                CacheControl="public, max-age=31536000",
            )

        await loop.run_in_executor(_executor, _upload)

        avatar_url = f"{self.settings.r2_public_url}/{storage_key}"
        logger.info(f"Avatar uploaded: {avatar_url} ({len(avatar_bytes)//1024}KB)")

        return {
            "url": avatar_url,
            "storage_key": storage_key,
        }

    async def delete_avatar(self, storage_key: str) -> None:
        """Delete an avatar from R2."""
        loop = __import__("asyncio").get_running_loop()

        def _do():
            self.client.delete_object(
                Bucket=self.settings.r2_bucket_name,
                Key=storage_key,
            )

        await loop.run_in_executor(_executor, _do)
        logger.info(f"Avatar deleted: {storage_key}")
