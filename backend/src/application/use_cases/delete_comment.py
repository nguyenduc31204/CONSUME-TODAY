"""
DeleteCommentUseCase — Xóa bình luận.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.repositories.circle_repository import CircleRepository


async def delete_comment(
    db: AsyncSession,
    comment_id: UUID,
    user_id: UUID,
) -> bool:
    """
    Xóa bình luận. Author bình luận hoặc circle owner được xóa.
    """
    repo: CircleRepository = _get_repo(db)

    comment = await repo.get_comment_by_id(comment_id)
    if not comment:
        return False

    post = await repo.get_post_by_id(comment.post_id)
    if not post:
        return False

    circle = await repo.get_circle_by_id(post.circle_id)
    if not circle or circle.is_deleted():
        return False

    # Only author of comment, post author, or circle owner can delete
    if (comment.author_id != user_id
            and post.author_id != user_id
            and not circle.is_owner(user_id)):
        from src.infrastructure.shared.exceptions import ForbiddenException
        raise ForbiddenException(message="Bạn không có quyền xóa bình luận này.")

    await repo.soft_delete_comment(comment_id)

    # Decrement comment count
    post.decrement_comments()
    await repo.update_post(post)
    return True


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import (
        CircleRepositoryImpl,
    )
    return CircleRepositoryImpl(db)
