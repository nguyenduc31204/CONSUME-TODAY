"""
ListCirclesUseCase — Danh sách Circle của user.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.circle_dto import CircleItem, CircleListResponse
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


async def list_circles(
    db: AsyncSession,
    user_id: UUID,
) -> CircleListResponse:
    """
    Lấy tất cả Circle mà user là thành viên hoặc owner.
    """
    repo: CircleRepository = _get_repo(db)

    circles = await repo.list_circles_for_user(user_id)
    items = []
    for circle in circles:
        member_count = await repo.count_members(circle.id)
        # post_count via separate query would be expensive — omit or add to repository
        items.append(_circle_to_item(
            circle,
            member_count=member_count,
            post_count=0,  # TODO: add post_count to circle model or query
            is_member=True,
            my_role="owner" if circle.owner_id == user_id else "member",
            my_status="approved",
        ))

    return CircleListResponse(items=items, total=len(items))


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import CircleRepositoryImpl
    return CircleRepositoryImpl(db)