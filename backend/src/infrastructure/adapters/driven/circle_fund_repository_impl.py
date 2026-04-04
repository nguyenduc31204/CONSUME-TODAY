"""
CircleFundRepositoryImpl — SQLAlchemy async implementation of CircleFundRepository.
"""

from datetime import date as date_type
from uuid import UUID

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.circle_fund import CircleFund
from src.domain.entities.circle_fund_transaction import CircleFundTransaction
from src.domain.repositories.circle_fund_repository import CircleFundRepository
from src.infrastructure.shared.datetime_utils import to_naive


def _map_fund(model) -> CircleFund:
    return CircleFund(
        id=model.id,
        circle_id=model.circle_id,
        balance=model.balance,
        total_income=model.total_income,
        total_expense=model.total_expense,
        currency=model.currency,
        created_at=to_naive(model.created_at),
        updated_at=to_naive(model.updated_at),
        deleted_at=to_naive(model.deleted_at),
    )


def _map_txn(model) -> CircleFundTransaction:
    return CircleFundTransaction(
        id=model.id,
        circle_id=model.circle_id,
        fund_id=model.fund_id,
        author_id=model.author_id,
        type=model.type,
        amount=model.amount,
        description=model.description,
        category=model.category,
        merchant_name=model.merchant_name,
        transaction_date=model.transaction_date,
        transaction_time=str(model.transaction_time) if model.transaction_time else None,
        split_type=model.split_type,
        split_amounts=model.split_amounts,
        paid_by=model.paid_by,
        created_at=to_naive(model.created_at),
        updated_at=to_naive(model.updated_at),
        deleted_at=to_naive(model.deleted_at),
    )


class CircleFundRepositoryImpl(CircleFundRepository):
    """SQLAlchemy implementation of CircleFundRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save_fund(self, fund: CircleFund) -> CircleFund:
        from src.infrastructure.adapters.driven.database import CircleFundModel
        stmt = select(CircleFundModel).where(
            CircleFundModel.circle_id == fund.circle_id,
            CircleFundModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            # Update existing
            existing.balance = fund.balance
            existing.total_income = fund.total_income
            existing.total_expense = fund.total_expense
            await self._session.flush()
            return _map_fund(existing)
        # Insert new
        model = CircleFundModel(
            id=fund.id,
            circle_id=fund.circle_id,
            balance=fund.balance,
            total_income=fund.total_income,
            total_expense=fund.total_expense,
            currency=fund.currency,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return _map_fund(model)

    async def get_fund_by_circle(self, circle_id: UUID) -> CircleFund | None:
        from src.infrastructure.adapters.driven.database import CircleFundModel
        stmt = select(CircleFundModel).where(
            CircleFundModel.circle_id == circle_id,
            CircleFundModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return _map_fund(model) if model else None

    async def init_fund(self, circle_id: UUID) -> CircleFund:
        """Create fund for a circle if it doesn't exist; return existing one otherwise."""
        existing = await self.get_fund_by_circle(circle_id)
        if existing:
            return existing
        return await self.save_fund(CircleFund(circle_id=circle_id))

    async def update_fund_balance(
        self,
        fund_id: UUID,
        delta_income: int = 0,
        delta_expense: int = 0,
    ) -> None:
        from src.infrastructure.adapters.driven.database import CircleFundModel
        stmt = (
            update(CircleFundModel)
            .where(
                CircleFundModel.id == fund_id,
                CircleFundModel.deleted_at.is_(None),
            )
            .values(
                total_income=CircleFundModel.total_income + delta_income,
                total_expense=CircleFundModel.total_expense + delta_expense,
                balance=CircleFundModel.balance + delta_income - delta_expense,
            )
        )
        await self._session.execute(stmt)

    async def save_fund_transaction(
        self, txn: CircleFundTransaction
    ) -> CircleFundTransaction:
        from datetime import time as time_type
        from src.infrastructure.adapters.driven.database import CircleFundTransactionModel

        # Parse "HH:MM" or "HH:MM:SS" string → datetime.time for DB TIME column
        db_time = None
        if txn.transaction_time:
            parts = txn.transaction_time.split(":")
            if len(parts) >= 2:
                try:
                    h, m = int(parts[0]), int(parts[1])
                    s = int(parts[2]) if len(parts) >= 3 else 0
                    db_time = time_type(h, m, s)
                except (ValueError, IndexError):
                    db_time = None

        model = CircleFundTransactionModel(
            id=txn.id,
            circle_id=txn.circle_id,
            fund_id=txn.fund_id,
            author_id=txn.author_id,
            type=txn.type,
            amount=txn.amount,
            description=txn.description,
            category=txn.category,
            merchant_name=txn.merchant_name,
            transaction_date=txn.transaction_date or date_type.today(),
            transaction_time=db_time,
            split_type=txn.split_type,
            split_amounts=(
                None
                if txn.split_amounts is None
                or txn.split_amounts == 'null'
                or txn.split_amounts == 'undefined'
                else txn.split_amounts
            ),
            paid_by=txn.paid_by or txn.author_id,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return _map_txn(model)

    async def list_fund_transactions(
        self,
        fund_id: UUID,
        month: str | None = None,
        type: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[CircleFundTransaction], int]:
        from datetime import date as date_type
        from src.infrastructure.adapters.driven.database import CircleFundTransactionModel
        conditions = [
            CircleFundTransactionModel.fund_id == fund_id,
            CircleFundTransactionModel.deleted_at.is_(None),
        ]
        if month:
            parts = month.split("-")
            if len(parts) == 2:
                try:
                    year_i, mo_i = int(parts[0]), int(parts[1])
                    if 1 <= mo_i <= 12:
                        start = date_type(year_i, mo_i, 1)
                        end_month = mo_i + 1
                        end_year = year_i
                        if end_month > 12:
                            end_month = 1
                            end_year = year_i + 1
                        end = date_type(end_year, end_month, 1)
                        conditions.append(CircleFundTransactionModel.transaction_date >= start)
                        conditions.append(CircleFundTransactionModel.transaction_date < end)
                except ValueError:
                    pass  # Invalid numbers, skip filter
        if type:
            conditions.append(CircleFundTransactionModel.type == type)

        count_stmt = select(func.count()).select_from(CircleFundTransactionModel).where(*conditions)
        count_result = await self._session.execute(count_stmt)
        total = count_result.scalar() or 0

        stmt = (
            select(CircleFundTransactionModel)
            .where(*conditions)
            .order_by(
                CircleFundTransactionModel.transaction_date.desc(),
                CircleFundTransactionModel.created_at.desc(),
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        items = [_map_txn(m) for m in result.scalars().all()]
        return items, total

    async def get_fund_transaction(self, txn_id: UUID) -> CircleFundTransaction | None:
        from src.infrastructure.adapters.driven.database import CircleFundTransactionModel
        stmt = select(CircleFundTransactionModel).where(
            CircleFundTransactionModel.id == txn_id,
            CircleFundTransactionModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return _map_txn(model) if model else None

    async def delete_fund_transaction(self, txn_id: UUID) -> None:
        from src.infrastructure.adapters.driven.database import CircleFundTransactionModel
        stmt = (
            update(CircleFundTransactionModel)
            .where(CircleFundTransactionModel.id == txn_id)
            .values(deleted_at=func.now())
        )
        await self._session.execute(stmt)
