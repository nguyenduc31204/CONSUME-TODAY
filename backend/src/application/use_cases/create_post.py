"""
CreatePostUseCase — Tạo bài viết trong Circle.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.request.circle_dto import CreatePostRequest
from src.application.dtos.response.circle_dto import PostItem
from src.domain.entities.circle_post import CirclePost
from src.domain.repositories.circle_repository import CircleRepository


def _post_to_item(post, author_name="", author_avatar=None, is_liked=False) -> PostItem:
    return PostItem(
        id=str(post.id),
        circle_id=str(post.circle_id),
        author_id=str(post.author_id),
        author_name=author_name,
        author_avatar=author_avatar,
        image_url=post.image_url,
        thumbnail_url=None,
        caption=post.caption,
        like_count=post.like_count,
        comment_count=post.comment_count,
        is_liked=is_liked,
        created_at=post.created_at,
    )


async def create_post(
    db: AsyncSession,
    circle_id: UUID,
    author_id: UUID,
    data: CreatePostRequest,
) -> PostItem | None:
    """
    Tạo bài viết mới trong Circle. Yêu cầu là thành viên.
    """
    repo: CircleRepository = _get_repo(db)

    circle = await repo.get_circle_by_id(circle_id)
    if not circle or circle.is_deleted():
        return None

    # Check membership
    member = await repo.get_member(circle_id, author_id)
    if not member and not circle.is_owner(author_id):
        from src.infrastructure.shared.exceptions import ForbiddenException
        raise ForbiddenException(message="Bạn không phải thành viên nhóm.")

    post = CirclePost(
        circle_id=circle_id,
        author_id=author_id,
        image_url=data.image_url,
        caption=data.caption,
        ocr_data=data.ocr_data,
        is_visible_link=data.is_visible_link,
    )

    saved = await repo.save_post(post)

    # Get author name from UserModel
    author_name, author_avatar = await _get_user_info(db, author_id)

    return _post_to_item(saved, author_name=author_name, author_avatar=author_avatar)


async def _get_user_info(db: AsyncSession, user_id: UUID) -> tuple[str, str | None]:
    from sqlalchemy import select

    from src.infrastructure.adapters.driven.database import UserModel
    stmt = select(UserModel).where(UserModel.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    return (f"{user.name}" if user and user.name else f"User {str(user_id)[:8]}",
            user.avatar_url if user else None)


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import (
        CircleRepositoryImpl,
    )
    return CircleRepositoryImpl(db)
