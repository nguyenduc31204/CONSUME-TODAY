"""
RejectJoinRequestUseCase — Owner từ chối yêu cầu tham gia Circle.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.repositories.circle_repository import CircleRepository


async def reject_join_request(
    db: AsyncSession,
    circle_id: UUID,
    target_user_id: UUID,
    requester_id: UUID,
) -> bool:
    """
    Owner từ chối yêu cầu tham gia (soft-delete the member record).

    Raises:
      ForbiddenException — nếu requester không phải owner
    """
    repo: CircleRepository = _get_repo(db)

    # Verify requester is owner
    req_member = await repo.get_member(circle_id, requester_id)
    if not req_member or req_member.role != "owner":
        from src.infrastructure.shared.exceptions import ForbiddenException

        raise ForbiddenException(message="Chỉ trưởng nhóm mới có thể từ chối yêu cầu.")

    # Soft-delete the pending request
    await repo.remove_member(circle_id, target_user_id)
    return True


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import (
        CircleRepositoryImpl,
    )

    return CircleRepositoryImpl(db)
