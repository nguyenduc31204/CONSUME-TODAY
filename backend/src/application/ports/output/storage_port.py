"""
StoragePort — Output port for image/object storage.
Implemented by R2/S3 adapter.
"""


class StoragePort:
    """Output port for image storage (Cloudflare R2 / S3)."""

    async def upload_image(self, file_bytes: bytes, filename: str) -> str:
        """
        Upload image bytes to object storage.
        Returns the public URL of the uploaded file.
        """
        raise NotImplementedError

    async def delete_image(self, storage_key: str) -> None:
        """Delete an image from object storage."""
        raise NotImplementedError

    async def generate_presigned_url(self, storage_key: str, expires_in: int = 3600) -> str:
        """Generate a presigned URL for direct upload."""
        raise NotImplementedError
