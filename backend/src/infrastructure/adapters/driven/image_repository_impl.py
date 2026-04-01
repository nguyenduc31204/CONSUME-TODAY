"""
ImageRepositoryImpl — SQLAlchemy async implementation of ImageRepository.
Driven adapter: persistence.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.image import Image
from src.domain.repositories.image_repository import ImageRepository
from src.infrastructure.adapters.driven.database import ImageModel


class ImageRepositoryImpl(ImageRepository):
    """SQLAlchemy implementation of ImageRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_entity(self, model: ImageModel) -> Image:
        return Image(
            id=model.id,
            user_id=model.user_id,
            url=model.url,
            thumbnail_url=model.thumbnail_url,
            filename=model.filename,
            mime_type=model.mime_type,
            file_size=model.file_size,
            width=model.width,
            height=model.height,
            storage_key=model.storage_key,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
        )

    def _to_model(self, entity: Image, model: Optional[ImageModel] = None) -> ImageModel:
        if model is None:
            model = ImageModel()
        model.id = entity.id
        model.user_id = entity.user_id
        model.url = entity.url
        model.thumbnail_url = entity.thumbnail_url
        model.filename = entity.filename
        model.mime_type = entity.mime_type
        model.file_size = entity.file_size
        model.width = entity.width
        model.height = entity.height
        model.storage_key = entity.storage_key
        model.created_at = entity.created_at
        model.updated_at = entity.updated_at
        model.deleted_at = entity.deleted_at
        return model

    async def save(self, image: Image) -> Image:
        model = self._to_model(image)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_entity(model)

    async def get_by_id(self, image_id: UUID) -> Optional[Image]:
        stmt = select(ImageModel).where(
            ImageModel.id == image_id,
            ImageModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def soft_delete(self, image_id: UUID) -> None:
        stmt = (
            update(ImageModel)
            .where(ImageModel.id == image_id)
            .values(deleted_at=datetime.utcnow(), updated_at=datetime.utcnow())
        )
        await self._session.execute(stmt)
        await self._session.flush()
