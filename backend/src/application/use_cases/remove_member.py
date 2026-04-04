"""
RemoveMemberUseCase — Xóa thành viên khỏi Circle.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.repositories.circle_repository import CircleRepository


async def remove_member(
    db: AsyncSession,
    circle_id: UUID,
    target_user_id: UUID,
    requester_id: UUID,
) -> bool:
    """
    Xóa thành viên khỏi Circle.
    Chỉ owner mới được xóa thành viên. Không cho xóa chính owner.
    """
    repo: CircleRepository = _get_repo(db)

    circle = await repo.get_circle_by_id(circle_id)
    if not circle or circle.is_deleted():
        return False

    # Owner có thể xóa bất kỳ thành viên nào (trừ chính mình)
    if circle.is_owner(requester_id):
        if circle.is_owner(target_user_id):
            from src.infrastructure.shared.exceptions import ForbiddenException
            raise ForbiddenException(message="Không thể xóa chủ nhóm.")
        await repo.remove_member(circle_id, target_user_id)
        return True

    # Thành viên không có quyền xóa người khác
    from src.infrastructure.shared.exceptions import ForbiddenException
    raise ForbiddenException(message="Bạn không có quyền xóa thành viên này.")


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import CircleRepositoryImpl
    return CircleRepositoryImpl(db)
