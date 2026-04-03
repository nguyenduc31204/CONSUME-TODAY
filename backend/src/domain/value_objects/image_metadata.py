"""
ImageMetadata Value Object — Immutable metadata for a captured photo.
"""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ImageMetadata:
    """
    Immutable value object for image metadata extracted by AI OCR.
    """

    original_url: str | None = None
    thumbnail_url: str | None = None
    file_size_bytes: int | None = None
    width: int | None = None
    height: int | None = None
    mime_type: str = "image/jpeg"
    storage_key: str | None = None  # R2/S3 key

    @property
    def aspect_ratio(self) -> float | None:
        """Calculate aspect ratio (width/height)."""
        if self.width and self.height and self.height > 0:
            return self.width / self.height
        return None

    def __repr__(self) -> str:
        return (
            f"<ImageMetadata(url={self.original_url}, "
            f"size={self.file_size_bytes}B, "
            f"dims={self.width}x{self.height})>"
        )
