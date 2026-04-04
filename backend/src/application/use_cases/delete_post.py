"""
DeletePostUseCase — Xóa bài viết.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.repositories.circle_repository import CircleRepository


async def delete_post(
    db: AsyncSession,
    post_id: UUID,
    user_id: UUID,
) -> bool:
    """
    Xóa bài viết. Author hoặc circle owner được xóa.
    """
    repo: CircleRepository = _get_repo(db)

    post = await repo.get_post_by_id(post_id)
    if not post:
        return False

    circle = await repo.get_circle_by_id(post.circle_id)
    if not circle or circle.is_deleted():
        return False

    # Only author or circle owner can delete
    if not circle.is_owner(user_id) and post.author_id != user_id:
        from src.infrastructure.shared.exceptions import ForbiddenException

        raise ForbiddenException(message="Bạn không có quyền xóa bài viết này.")

    await repo.soft_delete_post(post_id)
    return True


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import (
        CircleRepositoryImpl,
    )

    return CircleRepositoryImpl(db)
