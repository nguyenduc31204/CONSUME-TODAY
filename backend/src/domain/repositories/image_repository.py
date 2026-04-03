"""
ImageRepository — Abstract interface for Image entity persistence.
"""

from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.image import Image


class ImageRepository(ABC):
    """Abstract repository interface for Image entity."""

    @abstractmethod
    async def save(self, image: Image) -> Image:
        """Persist an image record."""
        ...

    @abstractmethod
    async def get_by_id(self, image_id: UUID) -> Image | None:
        """Retrieve an image by UUID."""
        ...

    @abstractmethod
    async def soft_delete(self, image_id: UUID) -> None:
        """Soft-delete an image record."""
        ...
