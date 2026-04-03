"""
Image Entity — Represents an uploaded image stored in R2.
"""

from uuid import UUID

from src.domain.entities.base import BaseEntity


class Image(BaseEntity):
    """Image entity for R2-stored photos."""

    def __init__(
        self,
        *,
        user_id: UUID,
        url: str,
        thumbnail_url: str | None = None,
        filename: str,
        mime_type: str,
        file_size: int,
        width: int | None = None,
        height: int | None = None,
        storage_key: str | None = None,
        id: UUID | None = None,
        created_at=None,
        updated_at=None,
        deleted_at=None,
    ) -> None:
        super().__init__(
            id=id,
            created_at=created_at,
            updated_at=updated_at,
            deleted_at=deleted_at,
        )
        self.user_id = user_id
        self.url = url
        self.thumbnail_url = thumbnail_url
        self.filename = filename
        self.mime_type = mime_type
        self.file_size = file_size
        self.width = width
        self.height = height
        self.storage_key = storage_key
