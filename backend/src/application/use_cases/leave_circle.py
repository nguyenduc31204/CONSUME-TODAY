"""
LeaveCircleUseCase — Thành viên rời nhóm.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.repositories.circle_repository import CircleRepository


async def leave_circle(
    db: AsyncSession,
    circle_id: UUID,
    user_id: UUID,
) -> bool:
    """
    Rời nhóm. Owner không thể rời (phải xóa nhóm).
    """
    repo: CircleRepository = _get_repo(db)

    circle = await repo.get_circle_by_id(circle_id)
    if not circle or circle.is_deleted():
        return False

    if circle.is_owner(user_id):
        from src.infrastructure.shared.exceptions import ForbiddenException

        raise ForbiddenException(
            message="Chủ nhóm không thể rời nhóm. Hãy xóa nhóm nếu muốn giải tán."
        )

    await repo.remove_member(circle_id, user_id)
    return True


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import (
        CircleRepositoryImpl,
    )

    return CircleRepositoryImpl(db)
