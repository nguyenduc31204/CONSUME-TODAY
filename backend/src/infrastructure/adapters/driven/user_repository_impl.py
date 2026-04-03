"""
UserRepositoryImpl — SQLAlchemy async implementation of UserRepository.
Driven adapter: persistence.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.user import User
from src.domain.repositories.user_repository import UserRepository
from src.infrastructure.adapters.driven.database import UserModel


class UserRepositoryImpl(UserRepository):
    """SQLAlchemy implementation of UserRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_entity(self, model: UserModel) -> User:
        return User(
            id=model.id,
            email=model.email,
            name=model.name,
            avatar_url=model.avatar_url,
            google_sub=model.google_sub,
            apple_sub=model.apple_sub,
            hashed_password=model.hashed_password,
            is_email_verified=model.is_email_verified,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
        )

    def _to_model(self, entity: User, model: UserModel | None = None) -> UserModel:
        if model is None:
            model = UserModel()
        model.id = entity.id
        model.email = entity.email
        model.name = entity.name
        model.avatar_url = entity.avatar_url
        model.google_sub = entity.google_sub
        model.apple_sub = entity.apple_sub
        model.hashed_password = entity.hashed_password
        model.is_email_verified = entity.is_email_verified
        model.is_active = entity.is_active
        model.created_at = entity.created_at
        model.updated_at = entity.updated_at
        model.deleted_at = entity.deleted_at
        return model

    async def save(self, user: User) -> User:
        model = self._to_model(user)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_entity(model)

    async def get_by_id(self, user_id: UUID) -> User | None:
        stmt = select(UserModel).where(
            UserModel.id == user_id,
            UserModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(UserModel).where(
            UserModel.email == email,
            UserModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_google_sub(self, google_sub: str) -> User | None:
        stmt = select(UserModel).where(
            UserModel.google_sub == google_sub,
            UserModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_apple_sub(self, apple_sub: str) -> User | None:
        stmt = select(UserModel).where(
            UserModel.apple_sub == apple_sub,
            UserModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def update(self, user: User) -> User:
        stmt = (
            update(UserModel)
            .where(UserModel.id == user.id)
            .values(
                email=user.email,
                name=user.name,
                avatar_url=user.avatar_url,
                google_sub=user.google_sub,
                apple_sub=user.apple_sub,
                hashed_password=user.hashed_password,
                is_email_verified=user.is_email_verified,
                is_active=user.is_active,
                updated_at=datetime.utcnow(),
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_by_id(user.id)

    async def delete(self, user_id: UUID) -> None:
        stmt = (
            update(UserModel)
            .where(UserModel.id == user_id)
            .values(deleted_at=datetime.utcnow(), updated_at=datetime.utcnow())
        )
        await self._session.execute(stmt)
        await self._session.flush()
