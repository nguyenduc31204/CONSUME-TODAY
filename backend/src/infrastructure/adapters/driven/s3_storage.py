"""
S3/R2 Storage Adapter — Driven adapter for Cloudflare R2 object storage.
Implements StoragePort.
"""
import hashlib
from datetime import datetime
from uuid import uuid4

import boto3
from botocore.exceptions import ClientError

from src.config import get_settings
from src.infrastructure.shared.loguru_config import get_logger

logger = get_logger()


class R2StorageAdapter:
    """
    Cloudflare R2 (S3-compatible) storage adapter.
    Uses boto3 with S3-compatible endpoint configuration.
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

    def _generate_key(self, filename: str) -> str:
        """Generate a unique storage key for the file."""
        timestamp = datetime.utcnow().strftime("%Y/%m")
        ext = filename.split(".")[-1] if "." in filename else "jpg"
        unique_id = hashlib.sha256(str(uuid4()).encode()).hexdigest()[:16]
        return f"memoir/{timestamp}/{unique_id}.{ext}"

    async def upload_image(self, file_bytes: bytes, filename: str) -> str:
        """
        Upload image bytes to R2 and return public URL.
        """
        key = self._generate_key(filename)

        try:
            self.client.put_object(
                Bucket=self.settings.r2_bucket_name,
                Key=key,
                Body=file_bytes,
                ContentType=f"image/{ext(filename)}",
                CacheControl="public, max-age=31536000",
            )

            public_url = f"{self.settings.r2_public_url}/{key}"
            logger.info(f"Image uploaded: {public_url}")
            return public_url

        except ClientError as e:
            logger.error(f"R2 upload failed: {e}")
            raise

    async def delete_image(self, storage_key: str) -> None:
        """Delete an image from R2."""
        try:
            self.client.delete_object(
                Bucket=self.settings.r2_bucket_name,
                Key=storage_key,
            )
            logger.info(f"Image deleted: {storage_key}")
        except ClientError as e:
            logger.error(f"R2 delete failed: {e}")
            raise

    async def generate_presigned_url(
        self,
        storage_key: str,
        expires_in: int = 3600,
    ) -> str:
        """Generate a presigned URL for direct client upload."""
        try:
            url = self.client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.settings.r2_bucket_name,
                    "Key": storage_key,
                },
                ExpiresIn=expires_in,
            )
            return url
        except ClientError as e:
            logger.error(f"R2 presigned URL failed: {e}")
            raise


def ext(filename: str) -> str:
    """Extract file extension, default to jpg."""
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
