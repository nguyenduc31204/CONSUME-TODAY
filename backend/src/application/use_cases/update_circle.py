"""
UpdateCircleUseCase — Sửa Circle (owner only).
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.request.circle_dto import UpdateCircleRequest
from src.application.dtos.response.circle_dto import CircleItem
from src.domain.repositories.circle_repository import CircleRepository


def _circle_to_item(circle, member_count=0, post_count=0, is_member=True, my_role=None) -> CircleItem:
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
        created_at=circle.created_at,
        updated_at=circle.updated_at,
    )


async def update_circle(
    db: AsyncSession,
    circle_id: UUID,
    user_id: UUID,
    data: UpdateCircleRequest,
) -> CircleItem | None:
    """
    Sửa Circle. Chỉ owner mới được sửa.
    """
    repo: CircleRepository = _get_repo(db)

    circle = await repo.get_circle_by_id(circle_id)
    if not circle or circle.is_deleted():
        return None

    if not circle.is_owner(user_id):
        from src.infrastructure.shared.exceptions import ForbiddenException
        raise ForbiddenException(message="Chỉ chủ nhóm mới có thể sửa.")

    if data.name is not None:
        circle.update_name(data.name)
    if data.description is not None:
        circle.update_description(data.description)
    if data.visibility is not None:
        circle.visibility = data.visibility
        circle.touch()
    if data.cover_image_url is not None:
        circle.cover_image_url = data.cover_image_url
        circle.touch()

    saved = await repo.update_circle(circle)
    member_count = await repo.count_members(circle_id)
    return _circle_to_item(saved, member_count=member_count, is_member=True, my_role="owner")


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import CircleRepositoryImpl
    return CircleRepositoryImpl(db)