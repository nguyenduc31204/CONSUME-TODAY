"""
GetCircleUseCase — Chi tiết một Circle.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.circle_dto import (
    CircleDetailResponse,
    CircleItem,
    MemberItem,
)
from src.domain.repositories.circle_repository import CircleRepository


def _circle_to_item(circle, member_count=0, post_count=0, is_member=True, my_role=None, my_status=None) -> CircleItem:
    return CircleItem(
        id=str(circle.id),
        name=circle.name,
        description=circle.description,
        cover_image_url=circle.cover_image_url,
        owner_id=str(circle.owner_id),
        visibility=circle.visibility,
        circle_type=circle.circle_type,
        max_members=circle.max_members,
        member_count=member_count,
        post_count=post_count,
        is_member=is_member,
        my_role=my_role,
        my_status=my_status,
        created_at=circle.created_at,
        updated_at=circle.updated_at,
    )


def _member_to_item(member, name="", avatar_url=None) -> MemberItem:
    return MemberItem(
        user_id=str(member.user_id),
        name=name or f"User {str(member.user_id)[:8]}",
        avatar_url=avatar_url,
        role=member.role,
        status=getattr(member, 'status', 'approved'),
        joined_at=member.joined_at,
    )


async def get_circle(
    db: AsyncSession,
    circle_id: UUID,
    user_id: UUID | None = None,
) -> CircleDetailResponse | None:
    """
    Lấy chi tiết Circle + danh sách thành viên (approved).
    Owner cũng nhận danh sách pending members.
    """
    repo: CircleRepository = _get_repo(db)

    circle = await repo.get_circle_by_id(circle_id)
    if not circle or circle.is_deleted():
        return None

    member_count = await repo.count_members(circle_id)
    members = await repo.list_members(circle_id)

    # Determine if user is member and their role
    my_role = None
    my_status = None
    is_member = True
    is_owner = False
    pending_members = []
    if user_id:
        my_member = await repo.get_member(circle_id, user_id)
        is_approved = my_member is not None and my_member.status == "approved"
        is_member = is_approved
        my_role = my_member.role if my_member and is_approved else None
        my_status = my_member.status if my_member else None
        is_owner = my_member is not None and my_member.role == "owner"

    # Owner gets pending requests too
    if is_owner:
        pending_members = await repo.list_pending_members(circle_id)

    return CircleDetailResponse(
        circle=_circle_to_item(circle, member_count=member_count, is_member=is_member, my_role=my_role, my_status=my_status),
        members=[_member_to_item(m) for m in members],
        pending_members=[_member_to_item(p) for p in pending_members],
    )


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import (
        CircleRepositoryImpl,
    )
    return CircleRepositoryImpl(db)
