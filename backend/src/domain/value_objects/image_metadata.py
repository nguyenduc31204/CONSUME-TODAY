"""
ImageMetadata Value Object — Immutable metadata for a captured photo.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True, slots=True)
class ImageMetadata:
    """
    Immutable value object for image metadata extracted by AI OCR.
    """

    original_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    mime_type: str = "image/jpeg"
    storage_key: Optional[str] = None  # R2/S3 key

    @property
    def aspect_ratio(self) -> Optional[float]:
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
