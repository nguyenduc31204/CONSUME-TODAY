"""
ToggleLikeUseCase — Thích / bỏ thích bài viết.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.circle_dto import LikeResponse
from src.domain.entities.circle_like import CircleLike
from src.domain.repositories.circle_repository import CircleRepository


async def toggle_like(
    db: AsyncSession,
    post_id: UUID,
    user_id: UUID,
) -> LikeResponse | None:
    """
    Toggle like trên bài viết. Nếu chưa thích → thích. Đã thích → bỏ thích.
    """
    repo: CircleRepository = _get_repo(db)

    post = await repo.get_post_by_id(post_id)
    if not post:
        return None

    circle = await repo.get_circle_by_id(post.circle_id)
    if not circle or circle.is_deleted():
        return None

    # Check membership
    member = await repo.get_member(post.circle_id, user_id)
    if not member and not circle.is_owner(user_id) and post.author_id != user_id:
        from src.infrastructure.shared.exceptions import ForbiddenException

        raise ForbiddenException(message="Bạn không có quyền thích bài viết này.")

    # Check if already liked
    from src.infrastructure.adapters.driven.database import CircleLikeModel

    stmt = select(CircleLikeModel).where(
        CircleLikeModel.post_id == post_id,
        CircleLikeModel.user_id == user_id,
        CircleLikeModel.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    liked: bool
    if existing:
        # Unlike — use repo to soft-delete
        await repo.remove_like(post_id, user_id)
        post.decrement_likes()
        liked = False
    else:
        # Like — create + save via repo
        new_like = CircleLike(
            post_id=post_id,
            user_id=user_id,
        )
        await repo.save_like(new_like)
        post.increment_likes()
        liked = True

    await repo.update_post(post)

    return LikeResponse(liked=liked, like_count=post.like_count)


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import (
        CircleRepositoryImpl,
    )

    return CircleRepositoryImpl(db)
