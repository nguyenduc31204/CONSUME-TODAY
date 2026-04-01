"""
CategoryRepositoryImpl — SQLAlchemy async implementation of CategoryRepository.
Driven adapter: persistence.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.category import Category
from src.domain.repositories.category_repository import CategoryRepository
from src.infrastructure.adapters.driven.database import CategoryModel


class CategoryRepositoryImpl(CategoryRepository):
    """SQLAlchemy implementation of CategoryRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_entity(self, model: CategoryModel) -> Category:
        return Category(
            id=model.id,
            wallet_id=model.wallet_id,
            name=model.name,
            icon=model.icon,
            color=model.color,
            emoji=model.emoji,
            is_default=model.is_default,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
        )

    def _to_model(self, entity: Category, model: Optional[CategoryModel] = None) -> CategoryModel:
        if model is None:
            model = CategoryModel()
        model.id = entity.id
        model.wallet_id = entity.wallet_id
        model.name = entity.name
        model.icon = entity.icon
        model.color = entity.color
        model.emoji = entity.emoji
        model.is_default = entity.is_default
        model.is_active = entity.is_active
        model.created_at = entity.created_at
        model.updated_at = entity.updated_at
        model.deleted_at = entity.deleted_at
        return model

    async def save(self, category: Category) -> Category:
        model = self._to_model(category)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_entity(model)

    async def get_by_id(self, category_id: UUID) -> Optional[Category]:
        stmt = select(CategoryModel).where(
            CategoryModel.id == category_id,
            CategoryModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_wallet_id(self, wallet_id: UUID) -> list[Category]:
        stmt = (
            select(CategoryModel)
            .where(
                CategoryModel.wallet_id == wallet_id,
                CategoryModel.deleted_at.is_(None),
                CategoryModel.is_active == True,
            )
            .order_by(CategoryModel.is_default.desc(), CategoryModel.created_at)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def get_by_name(self, wallet_id: UUID, name: str) -> Optional[Category]:
        stmt = select(CategoryModel).where(
            CategoryModel.wallet_id == wallet_id,
            CategoryModel.name == name,
            CategoryModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def update(self, category: Category) -> Category:
        stmt = (
            update(CategoryModel)
            .where(CategoryModel.id == category.id)
            .values(
                name=category.name,
                icon=category.icon,
                color=category.color,
                emoji=category.emoji,
                is_active=category.is_active,
                updated_at=datetime.utcnow(),
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_by_id(category.id)

    async def soft_delete(self, category_id: UUID) -> None:
        stmt = (
            update(CategoryModel)
            .where(CategoryModel.id == category_id)
            .values(deleted_at=datetime.utcnow(), updated_at=datetime.utcnow(), is_active=False)
        )
        await self._session.execute(stmt)
        await self._session.flush()
