"""
InviteMemberUseCase — Tạo invite link cho Circle.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.circle_dto import InviteResponse
from src.domain.repositories.circle_repository import CircleRepository


async def invite_member(
    db: AsyncSession,
    circle_id: UUID,
    user_id: UUID,
) -> InviteResponse | None:
    """
    Tạo invite code cho Circle. Chỉ owner mới được tạo.
    """
    repo: CircleRepository = _get_repo(db)

    circle = await repo.get_circle_by_id(circle_id)
    if not circle or circle.is_deleted():
        return None

    if not circle.is_owner(user_id):
        from src.infrastructure.shared.exceptions import ForbiddenException
        raise ForbiddenException(message="Chỉ chủ nhóm mới có thể mời thành viên.")

    # Invite code = last 6 chars of UUID (uppercase)
    invite_code = str(circle_id)[-6:].upper()

    return InviteResponse(
        invite_code=invite_code,
        share_url=f"/circles/shared/{invite_code}",
    )


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import (
        CircleRepositoryImpl,
    )
    return CircleRepositoryImpl(db)
