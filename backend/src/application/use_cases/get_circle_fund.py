"""
InitCircleFundUseCase — Initialize a fund when a Circle is created.
Called automatically from create_circle.py, but also callable standalone.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.circle_fund import CircleFund
from src.domain.repositories.circle_fund_repository import CircleFundRepository


async def init_circle_fund(
    db: AsyncSession,
    circle_id: UUID,
) -> CircleFund:
    """
    Initialize a fund for a circle. Safe to call multiple times —
    returns existing fund if already created.
    """
    repo: CircleFundRepository = _get_repo(db)
    return await repo.init_fund(circle_id)


def _get_repo(db: AsyncSession) -> CircleFundRepository:
    from src.infrastructure.adapters.driven.circle_fund_repository_impl import (
        CircleFundRepositoryImpl,
    )
    return CircleFundRepositoryImpl(db)
