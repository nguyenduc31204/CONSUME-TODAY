"""
ListCircleFundTransactionsUseCase — List transactions in a Circle's fund.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.circle_dto import (
    CircleFundTransactionResponse,
    ListCircleFundTransactionsResponse,
)
from src.domain.repositories.circle_fund_repository import CircleFundRepository


async def list_circle_fund_transactions(
    db: AsyncSession,
    circle_id: UUID,
    month: str | None = None,
    type: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> ListCircleFundTransactionsResponse:
    """
    List fund transactions with optional filters.
    """
    repo: CircleFundRepository = _get_repo(db)
    fund = await repo.get_fund_by_circle(circle_id)
    if not fund:
        return ListCircleFundTransactionsResponse(items=[], total=0)

    items, total = await repo.list_fund_transactions(
        fund_id=fund.id,
        month=month,
        type=type,
        skip=skip,
        limit=limit,
    )

    return ListCircleFundTransactionsResponse(
        items=[
            CircleFundTransactionResponse(
                id=str(t.id),
                circle_id=str(t.circle_id),
                fund_id=str(t.fund_id),
                author_id=str(t.author_id),
                type=t.type,
                amount=t.amount,
                description=t.description,
                category=t.category,
                merchant_name=t.merchant_name,
                transaction_date=t.transaction_date.isoformat()
                if t.transaction_date
                else None,
                transaction_time=t.transaction_time,
                split_type=t.split_type,
                split_amounts=t.split_amounts,
                paid_by=str(t.paid_by) if t.paid_by else None,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
            for t in items
        ],
        total=total,
    )


def _get_repo(db: AsyncSession) -> CircleFundRepository:
    from src.infrastructure.adapters.driven.circle_fund_repository_impl import (
        CircleFundRepositoryImpl,
    )

    return CircleFundRepositoryImpl(db)
