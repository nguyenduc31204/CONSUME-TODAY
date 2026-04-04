"""
ListPostsUseCase — Feed bài viết trong Circle.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.circle_dto import PostItem, PostListResponse
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


async def list_posts(
    db: AsyncSession,
    circle_id: UUID,
    viewer_id: UUID | None = None,
    skip: int = 0,
    limit: int = 20,
) -> PostListResponse | None:
    """
    Lấy feed bài viết của Circle.
    """
    repo: CircleRepository = _get_repo(db)

    circle = await repo.get_circle_by_id(circle_id)
    if not circle or circle.is_deleted():
        return None

    # Check visibility: link_shared → anyone can view
    # members_only → must be member
    if circle.visibility == "members_only":
        if viewer_id is None:
            from src.infrastructure.shared.exceptions import ForbiddenException
            raise ForbiddenException(message="Cần đăng nhập để xem nhóm này.")
        member = await repo.get_member(circle_id, viewer_id)
        if not member and not circle.is_owner(viewer_id):
            raise ForbiddenException(message="Bạn không phải thành viên nhóm.")

    posts, total = await repo.list_posts(circle_id, skip=skip, limit=limit)

    # Get author info for each post
    items = []
    for post in posts:
        author_name, author_avatar = await _get_user_info(db, post.author_id)
        is_liked = await _is_liked(db, circle_id, post.id, viewer_id) if viewer_id else False
        items.append(_post_to_item(post, author_name, author_avatar, is_liked))

    return PostListResponse(
        items=items,
        total=total,
        has_more=(skip + limit) < total,
    )


async def _get_user_info(db: AsyncSession, user_id: UUID) -> tuple[str, str | None]:
    from src.infrastructure.adapters.driven.database import UserModel
    stmt = select(UserModel).where(UserModel.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    return (f"{user.name}" if user and user.name else f"User {str(user_id)[:8]}",
            user.avatar_url if user else None)


async def _is_liked(db: AsyncSession, circle_id: UUID, post_id: UUID, user_id: UUID) -> bool:
    from src.infrastructure.adapters.driven.database import CircleLikeModel
    stmt = select(CircleLikeModel).where(
        CircleLikeModel.post_id == post_id,
        CircleLikeModel.user_id == user_id,
        CircleLikeModel.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import CircleRepositoryImpl
    return CircleRepositoryImpl(db)