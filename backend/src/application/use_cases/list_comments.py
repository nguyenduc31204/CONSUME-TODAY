"""
ListCommentsUseCase — Lấy bình luận của một bài viết.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.circle_dto import CommentItem, CommentListResponse
from src.domain.repositories.circle_repository import CircleRepository


def _comment_to_item(comment, author_name="", author_avatar=None) -> CommentItem:
    return CommentItem(
        id=str(comment.id),
        post_id=str(comment.post_id),
        author_id=str(comment.author_id),
        author_name=author_name,
        author_avatar=author_avatar,
        content=comment.content,
        created_at=comment.created_at,
    )


async def list_comments(
    db: AsyncSession,
    post_id: UUID,
) -> CommentListResponse:
    """
    Lấy tất cả bình luận của một bài viết.
    """
    repo: CircleRepository = _get_repo(db)

    post = await repo.get_post_by_id(post_id)
    if not post:
        return CommentListResponse(items=[], total=0)

    comments = await repo.list_comments(post_id)
    items = []
    for comment in comments:
        author_name, author_avatar = await _get_user_info(db, comment.author_id)
        items.append(_comment_to_item(comment, author_name, author_avatar))

    return CommentListResponse(items=items, total=len(items))


async def _get_user_info(db: AsyncSession, user_id: UUID) -> tuple[str, str | None]:
    from src.infrastructure.adapters.driven.database import UserModel

    stmt = select(UserModel).where(UserModel.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    return (
        f"{user.name}" if user and user.name else f"User {str(user_id)[:8]}",
        user.avatar_url if user else None,
    )


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import (
        CircleRepositoryImpl,
    )

    return CircleRepositoryImpl(db)
