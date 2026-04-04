"""
AddCircleFundTransactionUseCase — Add an income or expense to a Circle's fund.
"""

from datetime import date as date_type
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.request.circle_dto import CreateFundTransactionRequest
from src.application.dtos.response.circle_dto import CircleFundTransactionResponse
from src.domain.entities.circle_fund_transaction import CircleFundTransaction
from src.domain.repositories.circle_fund_repository import CircleFundRepository


async def add_circle_fund_transaction(
    db: AsyncSession,
    circle_id: UUID,
    author_id: UUID,
    data: CreateFundTransactionRequest,
) -> CircleFundTransactionResponse:
    """
    Add an income or expense transaction to the circle's shared fund.
    Automatically updates the fund's balance.
    """
    repo: CircleFundRepository = _get_repo(db)

    # Get or create fund
    fund = await repo.get_fund_by_circle(circle_id)
    if not fund:
        fund = await repo.init_fund(circle_id)

    # Parse date
    tx_date = date_type.today()
    if data.transaction_date:
        from datetime import datetime
        parsed = datetime.strptime(data.transaction_date, "%Y-%m-%d")
        tx_date = parsed.date()

    # Build transaction entity
    txn = CircleFundTransaction(
        circle_id=circle_id,
        fund_id=fund.id,
        author_id=author_id,
        type=data.type,
        amount=data.amount,
        description=data.description,
        category=data.category,
        merchant_name=data.merchant_name,
        transaction_date=tx_date,
        transaction_time=data.transaction_time,
        split_type=data.split_type,
        split_amounts=data.split_amounts,
        paid_by=UUID(data.paid_by) if data.paid_by else author_id,
    )

    saved = await repo.save_fund_transaction(txn)

    # Update fund balance
    delta_income = data.amount if data.type == "income" else 0
    delta_expense = data.amount if data.type == "expense" else 0
    await repo.update_fund_balance(fund.id, delta_income=delta_income, delta_expense=delta_expense)

    return CircleFundTransactionResponse(
        id=str(saved.id),
        circle_id=str(saved.circle_id),
        fund_id=str(saved.fund_id),
        author_id=str(saved.author_id),
        type=saved.type,
        amount=saved.amount,
        description=saved.description,
        category=saved.category,
        merchant_name=saved.merchant_name,
        transaction_date=saved.transaction_date.isoformat() if saved.transaction_date else None,
        transaction_time=saved.transaction_time,
        split_type=saved.split_type,
        split_amounts=saved.split_amounts,
        paid_by=str(saved.paid_by) if saved.paid_by else None,
        created_at=saved.created_at,
        updated_at=saved.updated_at,
    )


def _get_repo(db: AsyncSession) -> CircleFundRepository:
    from src.infrastructure.adapters.driven.circle_fund_repository_impl import (
        CircleFundRepositoryImpl,
    )
    return CircleFundRepositoryImpl(db)
