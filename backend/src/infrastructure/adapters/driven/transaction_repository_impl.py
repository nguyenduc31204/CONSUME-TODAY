"""
TransactionRepositoryImpl — SQLAlchemy async implementation of TransactionRepository.
Driven adapter: persistence.
"""

from datetime import datetime, time as time_type
from uuid import UUID

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.transaction import Transaction
from src.domain.repositories.transaction_repository import TransactionRepository
from src.infrastructure.adapters.driven.database import TransactionModel
from src.infrastructure.shared.datetime_utils import to_naive, utc_now


class TransactionRepositoryImpl(TransactionRepository):
    """SQLAlchemy implementation of TransactionRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_entity(self, model: TransactionModel) -> Transaction:
        return Transaction(
            id=model.id,
            user_id=model.user_id,
            wallet_id=model.wallet_id,
            category_id=model.category_id,
            image_url=model.image_url,
            thumbnail_url=model.thumbnail_url,
            merchant_name=model.merchant_name,
            amount=model.amount,
            currency=model.currency,
            transaction_date=model.transaction_date,
            transaction_time=model.transaction_time.strftime("%H:%M") if model.transaction_time else None,
            note=model.note,
            ocr_confidence=model.ocr_confidence,
            is_life_log=model.is_life_log,
            is_income=model.is_income,
            is_manual=getattr(model, 'is_manual', False),
            transaction_status=model.transaction_status,
            created_at=to_naive(model.created_at),
            updated_at=to_naive(model.updated_at),
            deleted_at=to_naive(model.deleted_at),
        )

    def _to_model(
        self, entity: Transaction, model: TransactionModel | None = None
    ) -> TransactionModel:
        if model is None:
            model = TransactionModel()
        model.id = entity.id
        model.user_id = entity.user_id
        model.wallet_id = entity.wallet_id
        model.category_id = entity.category_id
        model.image_url = entity.image_url
        model.thumbnail_url = entity.thumbnail_url
        model.merchant_name = entity.merchant_name
        model.amount = entity.amount
        model.currency = entity.currency
        model.transaction_date = entity.transaction_date
        # Convert "HH:MM" or "HH:MM:SS" string → datetime.time for DB TIME column
        if entity.transaction_time is not None:
            parts = entity.transaction_time.split(":")
            if len(parts) >= 2:
                try:
                    h, m = int(parts[0]), int(parts[1])
                    s = int(parts[2]) if len(parts) >= 3 else 0
                    model.transaction_time = time_type(h, m, s)
                except (ValueError, IndexError):
                    model.transaction_time = None
            else:
                model.transaction_time = None
        else:
            model.transaction_time = None
        model.note = entity.note
        model.ocr_confidence = entity.ocr_confidence
        model.is_life_log = entity.is_life_log
        model.is_income = entity.is_income
        model.is_manual = entity.is_manual
        model.transaction_status = entity.transaction_status
        model.created_at = to_naive(entity.created_at)
        model.updated_at = to_naive(entity.updated_at)
        model.deleted_at = to_naive(entity.deleted_at)
        return model

    async def save(self, transaction: Transaction) -> Transaction:
        model = self._to_model(transaction)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_entity(model)

    async def get_by_id(self, transaction_id: UUID) -> Transaction | None:
        stmt = select(TransactionModel).where(
            TransactionModel.id == transaction_id,
            TransactionModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_user(
        self,
        user_id: UUID,
        *,
        wallet_id: UUID | None = None,
        category_id: UUID | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        updated_since: datetime | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Transaction], int]:
        """List transactions with filters and total count."""
        conditions = [
            TransactionModel.user_id == user_id,
            TransactionModel.deleted_at.is_(None),
        ]

        if wallet_id:
            conditions.append(TransactionModel.wallet_id == wallet_id)
        if category_id:
            conditions.append(TransactionModel.category_id == category_id)
        if start_date:
            conditions.append(TransactionModel.transaction_date >= start_date)
        if end_date:
            conditions.append(TransactionModel.transaction_date <= end_date)
        if updated_since:
            conditions.append(TransactionModel.updated_at > updated_since)

        # Count
        count_stmt = (
            select(func.count()).select_from(TransactionModel).where(and_(*conditions))
        )
        total = (await self._session.execute(count_stmt)).scalar_one()

        # List
        list_stmt = (
            select(TransactionModel)
            .where(and_(*conditions))
            .order_by(
                TransactionModel.transaction_date.desc().nullslast(),
                TransactionModel.created_at.desc(),
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(list_stmt)
        items = [self._to_entity(m) for m in result.scalars().all()]
        return items, total

    async def update(self, transaction: Transaction) -> Transaction:
        stmt = (
            update(TransactionModel)
            .where(TransactionModel.id == transaction.id)
            .values(
                wallet_id=transaction.wallet_id,
                category_id=transaction.category_id,
                image_url=transaction.image_url,
                thumbnail_url=transaction.thumbnail_url,
                merchant_name=transaction.merchant_name,
                amount=transaction.amount,
                currency=transaction.currency,
                transaction_date=transaction.transaction_date,
                note=transaction.note,
                ocr_confidence=transaction.ocr_confidence,
                is_life_log=transaction.is_life_log,
                is_income=transaction.is_income,
                transaction_status=transaction.transaction_status,
                updated_at=utc_now(),
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_by_id(transaction.id)

    async def soft_delete(self, transaction_id: UUID) -> None:
        stmt = (
            update(TransactionModel)
            .where(TransactionModel.id == transaction_id)
            .values(deleted_at=utc_now(), updated_at=utc_now())
        )
        await self._session.execute(stmt)
        await self._session.flush()
