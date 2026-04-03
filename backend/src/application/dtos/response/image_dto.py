"""
Response DTOs — Image-related Pydantic models for API responses.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ImageResponse(BaseModel):
    """Response DTO for an Image entity."""

    id: UUID
    user_id: UUID
    url: str
    thumbnail_url: str | None = None
    filename: str
    mime_type: str
    file_size: int
    width: int | None = None
    height: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
