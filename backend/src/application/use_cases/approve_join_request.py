"""
ApproveJoinRequestUseCase — Owner phê duyệt yêu cầu tham gia Circle.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.repositories.circle_repository import CircleRepository


async def approve_join_request(
    db: AsyncSession,
    circle_id: UUID,
    target_user_id: UUID,
    requester_id: UUID,
) -> bool:
    """
    Owner phê duyệt yêu cầu tham gia.

    Raises:
      ForbiddenException — nếu requester không phải owner
      AppException        — nếu không tìm thấy member
    """
    repo: CircleRepository = _get_repo(db)

    # Verify requester is owner
    req_member = await repo.get_member(circle_id, requester_id)
    if not req_member or req_member.role != "owner":
        from src.infrastructure.shared.exceptions import ForbiddenException
        raise ForbiddenException(message="Chỉ trưởng nhóm mới có thể duyệt yêu cầu.")

    # Update status
    updated = await repo.update_member_status(circle_id, target_user_id, "approved")
    if not updated:
        from src.infrastructure.shared.exceptions import NotFoundException
        raise NotFoundException(message="Không tìm thấy yêu cầu tham gia.")
    return True


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import (
        CircleRepositoryImpl,
    )
    return CircleRepositoryImpl(db)
