"""
WalletRepositoryImpl — SQLAlchemy async implementation of WalletRepository.
Driven adapter: persistence.
"""

from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.wallet import Wallet
from src.domain.repositories.wallet_repository import WalletRepository
from src.infrastructure.adapters.driven.database import WalletModel
from src.infrastructure.shared.datetime_utils import to_naive, utc_now


class WalletRepositoryImpl(WalletRepository):
    """SQLAlchemy implementation of WalletRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_entity(self, model: WalletModel) -> Wallet:
        return Wallet(
            id=model.id,
            user_id=model.user_id,
            name=model.name,
            description=model.description,
            color=model.color,
            icon=model.icon,
            is_default=model.is_default,
            is_personal=model.is_personal,
            balance=model.balance,
            created_at=to_naive(model.created_at),
            updated_at=to_naive(model.updated_at),
            deleted_at=to_naive(model.deleted_at),
        )

    def _to_model(
        self, entity: Wallet, model: WalletModel | None = None
    ) -> WalletModel:
        if model is None:
            model = WalletModel()
        model.id = entity.id
        model.user_id = entity.user_id
        model.name = entity.name
        model.description = entity.description
        model.color = entity.color
        model.icon = entity.icon
        model.is_default = entity.is_default
        model.is_personal = entity.is_personal
        model.balance = entity.balance
        model.created_at = to_naive(entity.created_at)
        model.updated_at = to_naive(entity.updated_at)
        model.deleted_at = to_naive(entity.deleted_at)
        return model

    async def save(self, wallet: Wallet) -> Wallet:
        model = self._to_model(wallet)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_entity(model)

    async def get_by_id(self, wallet_id: UUID) -> Wallet | None:
        stmt = select(WalletModel).where(
            WalletModel.id == wallet_id,
            WalletModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_user_id(self, user_id: UUID) -> list[Wallet]:
        stmt = (
            select(WalletModel)
            .where(
                WalletModel.user_id == user_id,
                WalletModel.deleted_at.is_(None),
            )
            .order_by(WalletModel.is_default.desc(), WalletModel.created_at)
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def get_default(self, user_id: UUID) -> Wallet | None:
        stmt = select(WalletModel).where(
            WalletModel.user_id == user_id,
            WalletModel.is_default,
            WalletModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def update(self, wallet: Wallet) -> Wallet:
        stmt = (
            update(WalletModel)
            .where(WalletModel.id == wallet.id)
            .values(
                name=wallet.name,
                description=wallet.description,
                color=wallet.color,
                icon=wallet.icon,
                balance=wallet.balance,
                is_default=wallet.is_default,
                is_personal=wallet.is_personal,
                updated_at=utc_now(),
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_by_id(wallet.id)

    async def soft_delete(self, wallet_id: UUID) -> None:
        stmt = (
            update(WalletModel)
            .where(WalletModel.id == wallet_id)
            .values(deleted_at=utc_now(), updated_at=utc_now())
        )
        await self._session.execute(stmt)
        await self._session.flush()
