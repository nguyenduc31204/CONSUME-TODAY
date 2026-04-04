"""
DeleteCircleUseCase — Xóa Circle (owner only).
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.repositories.circle_repository import CircleRepository


async def delete_circle(
    db: AsyncSession,
    circle_id: UUID,
    user_id: UUID,
) -> bool:
    """
    Xóa Circle (soft delete). Chỉ owner mới được xóa.
    """
    repo: CircleRepository = _get_repo(db)

    circle = await repo.get_circle_by_id(circle_id)
    if not circle or circle.is_deleted():
        return False

    if not circle.is_owner(user_id):
        from src.infrastructure.shared.exceptions import ForbiddenException

        raise ForbiddenException(message="Chỉ chủ nhóm mới có thể xóa nhóm.")

    await repo.soft_delete_circle(circle_id)
    return True


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import (
        CircleRepositoryImpl,
    )

    return CircleRepositoryImpl(db)
