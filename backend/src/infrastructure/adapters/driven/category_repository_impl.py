"""
CategoryRepositoryImpl — SQLAlchemy async implementation of CategoryRepository.
Driven adapter: persistence.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.category import Category
from src.domain.repositories.category_repository import CategoryRepository
from src.infrastructure.adapters.driven.database import CategoryModel
from src.infrastructure.shared.datetime_utils import to_naive, utc_now


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
            created_at=to_naive(model.created_at),
            updated_at=to_naive(model.updated_at),
            deleted_at=to_naive(model.deleted_at),
        )

    def _to_model(
        self, entity: Category, model: CategoryModel | None = None
    ) -> CategoryModel:
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
        model.created_at = to_naive(entity.created_at)
        model.updated_at = to_naive(entity.updated_at)
        model.deleted_at = to_naive(entity.deleted_at)
        return model

    async def save(self, category: Category) -> Category:
        model = self._to_model(category)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_entity(model)

    async def get_by_id(self, category_id: UUID) -> Category | None:
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
                CategoryModel.is_active,
            )
            .order_by(CategoryModel.is_default.desc(), CategoryModel.created_at)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def get_by_user_id(self, user_id: UUID) -> list[Category]:
        """List all active categories across all wallets belonging to a user."""
        from src.infrastructure.adapters.driven.database import WalletModel

        stmt = (
            select(CategoryModel)
            .join(WalletModel, CategoryModel.wallet_id == WalletModel.id)
            .where(
                WalletModel.user_id == user_id,
                WalletModel.deleted_at.is_(None),
                CategoryModel.deleted_at.is_(None),
                CategoryModel.is_active,
            )
            .order_by(CategoryModel.is_default.desc(), CategoryModel.created_at)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def get_by_name(self, wallet_id: UUID, name: str) -> Category | None:
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
                updated_at=utc_now(),
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_by_id(category.id)

    async def soft_delete(self, category_id: UUID) -> None:
        stmt = (
            update(CategoryModel)
            .where(CategoryModel.id == category_id)
            .values(
                deleted_at=utc_now(),
                updated_at=utc_now(),
                is_active=False,
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()
