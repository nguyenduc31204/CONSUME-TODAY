"""
DeleteCircleFundTransactionUseCase — Soft-delete a fund transaction.
Only the author or circle owner can delete.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.repositories.circle_fund_repository import CircleFundRepository
from src.infrastructure.shared.exceptions import ForbiddenException, NotFoundException


async def delete_circle_fund_transaction(
    db: AsyncSession,
    circle_id: UUID,
    txn_id: UUID,
    user_id: UUID,
) -> None:
    """
    Soft-delete a fund transaction. Only the author or circle owner can delete.
    Also reverses the amount from the fund balance.
    """
    repo: CircleFundRepository = _get_repo(db)

    # Get the transaction
    txn = await repo.get_fund_transaction(txn_id)
    if not txn or str(txn.circle_id) != str(circle_id):
        raise NotFoundException(message="Không tìm thấy giao dịch quỹ.")

    # Check permission: author or circle owner
    from src.application.use_cases.get_circle import get_circle as _get_circle

    circle = await _get_circle(db=db, circle_id=circle_id, user_id=user_id)
    if not circle:
        raise NotFoundException(message="Circle không tìm thấy.")

    is_owner = str(circle.circle.owner_id) == str(user_id)
    is_author = str(txn.author_id) == str(user_id)

    if not is_owner and not is_author:
        raise ForbiddenException(message="Bạn không có quyền xóa giao dịch này.")

    # Reverse balance change
    delta_income = -txn.amount if txn.type == "income" else 0
    delta_expense = -txn.amount if txn.type == "expense" else 0
    await repo.update_fund_balance(
        txn.fund_id,
        delta_income=delta_income,
        delta_expense=delta_expense,
    )

    # Soft-delete
    await repo.delete_fund_transaction(txn_id)


def _get_repo(db: AsyncSession) -> CircleFundRepository:
    from src.infrastructure.adapters.driven.circle_fund_repository_impl import (
        CircleFundRepositoryImpl,
    )

    return CircleFundRepositoryImpl(db)
