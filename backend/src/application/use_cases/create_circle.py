"""
CreateCircleUseCase — Tạo Circle mới.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.request.circle_dto import CreateCircleRequest
from src.application.dtos.response.circle_dto import CircleCreatedResponse, CircleItem
from src.domain.entities.circle import Circle
from src.domain.entities.circle_member import CircleMember
from src.domain.repositories.circle_repository import CircleRepository


def _circle_to_item(circle, member_count=0, post_count=0, is_member=True, my_role="owner", my_status="approved") -> CircleItem:
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


async def create_circle(
    db: AsyncSession,
    user_id: UUID,
    data: CreateCircleRequest,
) -> CircleCreatedResponse:
    """
    Tạo Circle mới và tự động add owner làm thành viên + init quỹ chung.
    """
    repo: CircleRepository = _get_repo(db)

    # Tạo circle
    circle = Circle(
        name=data.name,
        owner_id=user_id,
        description=data.description,
        cover_image_url=data.cover_image_url,
        visibility=data.visibility,
        circle_type=data.circle_type,
        max_members=data.max_members,
    )
    saved = await repo.save_circle(circle)

    # Add owner làm member
    member = CircleMember(
        circle_id=saved.id,
        user_id=user_id,
        role="owner",
    )
    await repo.save_member(member)

    # Init quỹ chung cho circle
    from src.application.use_cases.get_circle_fund import init_circle_fund
    await init_circle_fund(db, saved.id)

    # Generate invite code (6 chars from circle id)
    invite_code = str(saved.id)[-6:].upper()

    return CircleCreatedResponse(
        circle=_circle_to_item(saved),
        invite_code=invite_code,
    )


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import (
        CircleRepositoryImpl,
    )
    return CircleRepositoryImpl(db)
