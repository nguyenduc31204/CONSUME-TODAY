"""
AddCommentUseCase — Bình luận trên bài viết.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.request.circle_dto import CreateCommentRequest
from src.application.dtos.response.circle_dto import CommentItem
from src.domain.entities.circle_comment import CircleComment
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


async def add_comment(
    db: AsyncSession,
    post_id: UUID,
    author_id: UUID,
    data: CreateCommentRequest,
) -> CommentItem | None:
    """
    Thêm bình luận. Yêu cầu là thành viên hoặc author.
    """
    repo: CircleRepository = _get_repo(db)

    post = await repo.get_post_by_id(post_id)
    if not post:
        return None

    circle = await repo.get_circle_by_id(post.circle_id)
    if not circle or circle.is_deleted():
        return None

    # Check membership (author always can comment)
    member = await repo.get_member(post.circle_id, author_id)
    if not member and not circle.is_owner(author_id) and post.author_id != author_id:
        from src.infrastructure.shared.exceptions import ForbiddenException
        raise ForbiddenException(message="Bạn không có quyền bình luận.")

    comment = CircleComment(
        post_id=post_id,
        author_id=author_id,
        content=data.content,
    )
    saved = await repo.save_comment(comment)

    # Increment comment count
    post.increment_comments()
    await repo.update_post(post)

    # Get author name
    author_name, author_avatar = await _get_user_info(db, author_id)
    return _comment_to_item(saved, author_name, author_avatar)


async def _get_user_info(db: AsyncSession, user_id: UUID) -> tuple[str, str | None]:
    from sqlalchemy import select
    from src.infrastructure.adapters.driven.database import UserModel
    stmt = select(UserModel).where(UserModel.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    return (f"{user.name}" if user and user.name else f"User {str(user_id)[:8]}",
            user.avatar_url if user else None)


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import CircleRepositoryImpl
    return CircleRepositoryImpl(db)