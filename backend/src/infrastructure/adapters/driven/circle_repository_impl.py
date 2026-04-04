"""
CircleRepositoryImpl — SQLAlchemy async implementation of CircleRepository.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.circle import Circle
from src.domain.entities.circle_comment import CircleComment
from src.domain.entities.circle_like import CircleLike
from src.domain.entities.circle_member import CircleMember
from src.domain.entities.circle_post import CirclePost
from src.domain.repositories.circle_repository import CircleRepository
from src.infrastructure.shared.datetime_utils import to_naive, utc_now


def _map_circle(model) -> Circle:
    return Circle(
        id=model.id,
        name=model.name,
        description=model.description,
        cover_image_url=model.cover_image_url,
        owner_id=model.owner_id,
        visibility=model.visibility,
        circle_type=model.circle_type,
        max_members=model.max_members,
        created_at=to_naive(model.created_at),
        updated_at=to_naive(model.updated_at),
        deleted_at=to_naive(model.deleted_at),
    )


def _map_member(model) -> CircleMember:
    return CircleMember(
        id=model.id,
        circle_id=model.circle_id,
        user_id=model.user_id,
        role=model.role,
        status=getattr(model, "member_status", "approved"),
        joined_at=to_naive(model.joined_at),
        created_at=to_naive(model.created_at),
        updated_at=to_naive(model.updated_at),
        deleted_at=to_naive(model.deleted_at),
    )


def _map_post(model) -> CirclePost:
    return CirclePost(
        id=model.id,
        circle_id=model.circle_id,
        author_id=model.author_id,
        image_url=model.image_url,
        caption=model.caption,
        ocr_data=model.ocr_data,
        is_visible_link=model.is_visible_link,
        like_count=model.like_count,
        comment_count=model.comment_count,
        created_at=to_naive(model.created_at),
        updated_at=to_naive(model.updated_at),
        deleted_at=to_naive(model.deleted_at),
    )


def _map_comment(model) -> CircleComment:
    return CircleComment(
        id=model.id,
        post_id=model.post_id,
        author_id=model.author_id,
        content=model.content,
        created_at=to_naive(model.created_at),
        updated_at=to_naive(model.updated_at),
        deleted_at=to_naive(model.deleted_at),
    )


# Lazy import models to avoid circular imports
def _get_model(db: AsyncSession, model_name: str):
    """Get ORM model class from database module."""
    from src.infrastructure.adapters.driven.database import (
        CircleCommentModel,
        CircleMemberModel,
        CircleModel,
        CirclePostModel,
    )

    return {
        "CircleModel": CircleModel,
        "CircleMemberModel": CircleMemberModel,
        "CirclePostModel": CirclePostModel,
        "CircleCommentModel": CircleCommentModel,
    }[model_name]


class CircleRepositoryImpl(CircleRepository):
    """SQLAlchemy implementation of CircleRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ── Circle ────────────────────────────────────────────────

    async def save_circle(self, circle: Circle) -> Circle:
        from src.infrastructure.adapters.driven.database import CircleModel

        model = CircleModel(
            id=circle.id,
            name=circle.name,
            description=circle.description,
            cover_image_url=circle.cover_image_url,
            owner_id=circle.owner_id,
            visibility=circle.visibility,
            circle_type=circle.circle_type,
            max_members=circle.max_members,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return _map_circle(model)

    async def get_circle_by_id(self, circle_id: UUID) -> Circle | None:
        from src.infrastructure.adapters.driven.database import CircleModel

        stmt = select(CircleModel).where(
            CircleModel.id == circle_id,
            CircleModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return _map_circle(model) if model else None

    async def list_circles_for_user(self, user_id: UUID) -> list[Circle]:
        from src.infrastructure.adapters.driven.database import (
            CircleMemberModel,
            CircleModel,
        )

        # Get circles where user is owner OR approved member
        stmt = (
            select(CircleModel)
            .outerjoin(
                CircleMemberModel,
                and_(
                    CircleMemberModel.circle_id == CircleModel.id,
                    CircleMemberModel.user_id == user_id,
                    CircleMemberModel.deleted_at.is_(None),
                    CircleMemberModel.member_status == "approved",
                ),
            )
            .where(
                CircleModel.deleted_at.is_(None),
                (CircleModel.owner_id == user_id)
                | (CircleMemberModel.user_id == user_id),
            )
            .distinct()
        )
        result = await self._session.execute(stmt)
        return [_map_circle(m) for m in result.scalars().all()]

    async def list_circles_for_user_since(
        self, user_id: UUID, since: datetime | None
    ) -> list[Circle]:
        from src.infrastructure.adapters.driven.database import (
            CircleMemberModel,
            CircleModel,
        )

        conditions = [
            CircleModel.deleted_at.is_(None),
            (CircleModel.owner_id == user_id) | (CircleMemberModel.user_id == user_id),
        ]
        if since:
            conditions.append(CircleModel.updated_at > since)

        stmt = (
            select(CircleModel)
            .outerjoin(
                CircleMemberModel,
                and_(
                    CircleMemberModel.circle_id == CircleModel.id,
                    CircleMemberModel.user_id == user_id,
                    CircleMemberModel.deleted_at.is_(None),
                ),
            )
            .where(and_(*conditions))
            .distinct()
        )
        result = await self._session.execute(stmt)
        return [_map_circle(m) for m in result.scalars().all()]

    async def update_circle(self, circle: Circle) -> Circle:
        from src.infrastructure.adapters.driven.database import CircleModel

        stmt = (
            update(CircleModel)
            .where(CircleModel.id == circle.id)
            .values(
                name=circle.name,
                description=circle.description,
                cover_image_url=circle.cover_image_url,
                visibility=circle.visibility,
                updated_at=utc_now(),
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_circle_by_id(circle.id)

    async def soft_delete_circle(self, circle_id: UUID) -> None:
        from src.infrastructure.adapters.driven.database import CircleModel

        stmt = (
            update(CircleModel)
            .where(CircleModel.id == circle_id)
            .values(deleted_at=utc_now(), updated_at=utc_now())
        )
        await self._session.execute(stmt)
        await self._session.flush()

    # ── CircleMember ──────────────────────────────────────────

    async def save_member(self, member: CircleMember) -> CircleMember:
        from src.infrastructure.adapters.driven.database import CircleMemberModel

        model = CircleMemberModel(
            id=member.id,
            circle_id=member.circle_id,
            user_id=member.user_id,
            role=member.role,
            member_status=member.status,
            joined_at=to_naive(member.joined_at),
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return _map_member(model)

    async def get_member(self, circle_id: UUID, user_id: UUID) -> CircleMember | None:
        from src.infrastructure.adapters.driven.database import CircleMemberModel

        stmt = select(CircleMemberModel).where(
            CircleMemberModel.circle_id == circle_id,
            CircleMemberModel.user_id == user_id,
            CircleMemberModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return _map_member(model) if model else None

    async def list_members(self, circle_id: UUID) -> list[CircleMember]:
        from src.infrastructure.adapters.driven.database import CircleMemberModel

        stmt = select(CircleMemberModel).where(
            CircleMemberModel.circle_id == circle_id,
            CircleMemberModel.deleted_at.is_(None),
            CircleMemberModel.member_status == "approved",
        )
        result = await self._session.execute(stmt)
        return [_map_member(m) for m in result.scalars().all()]

    async def list_pending_members(self, circle_id: UUID) -> list[CircleMember]:
        from src.infrastructure.adapters.driven.database import CircleMemberModel

        stmt = select(CircleMemberModel).where(
            CircleMemberModel.circle_id == circle_id,
            CircleMemberModel.deleted_at.is_(None),
            CircleMemberModel.member_status == "pending",
        )
        result = await self._session.execute(stmt)
        return [_map_member(m) for m in result.scalars().all()]

    async def count_members(self, circle_id: UUID) -> int:
        from src.infrastructure.adapters.driven.database import CircleMemberModel

        stmt = (
            select(func.count())
            .select_from(CircleMemberModel)
            .where(
                CircleMemberModel.circle_id == circle_id,
                CircleMemberModel.deleted_at.is_(None),
                CircleMemberModel.member_status == "approved",
            )
        )
        return (await self._session.execute(stmt)).scalar_one()

    async def update_member_status(
        self, circle_id: UUID, user_id: UUID, status: str
    ) -> CircleMember | None:
        from src.infrastructure.adapters.driven.database import CircleMemberModel

        stmt = (
            update(CircleMemberModel)
            .where(
                CircleMemberModel.circle_id == circle_id,
                CircleMemberModel.user_id == user_id,
                CircleMemberModel.deleted_at.is_(None),
            )
            .values(member_status=status, updated_at=utc_now())
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_member(circle_id, user_id)

    async def remove_member(self, circle_id: UUID, user_id: UUID) -> None:
        from src.infrastructure.adapters.driven.database import CircleMemberModel

        stmt = (
            update(CircleMemberModel)
            .where(
                CircleMemberModel.circle_id == circle_id,
                CircleMemberModel.user_id == user_id,
            )
            .values(deleted_at=utc_now(), updated_at=utc_now())
        )
        await self._session.execute(stmt)
        await self._session.flush()

    # ── CirclePost ────────────────────────────────────────────

    async def save_post(self, post: CirclePost) -> CirclePost:
        from src.infrastructure.adapters.driven.database import CirclePostModel

        model = CirclePostModel(
            id=post.id,
            circle_id=post.circle_id,
            author_id=post.author_id,
            image_url=post.image_url,
            caption=post.caption,
            ocr_data=post.ocr_data,
            is_visible_link=post.is_visible_link,
            like_count=post.like_count,
            comment_count=post.comment_count,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return _map_post(model)

    async def get_post_by_id(self, post_id: UUID) -> CirclePost | None:
        from src.infrastructure.adapters.driven.database import CirclePostModel

        stmt = select(CirclePostModel).where(
            CirclePostModel.id == post_id,
            CirclePostModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return _map_post(model) if model else None

    async def list_posts(
        self, circle_id: UUID, *, skip: int = 0, limit: int = 20
    ) -> tuple[list[CirclePost], int]:
        from src.infrastructure.adapters.driven.database import CirclePostModel

        conditions = [
            CirclePostModel.circle_id == circle_id,
            CirclePostModel.deleted_at.is_(None),
        ]
        count_stmt = (
            select(func.count()).select_from(CirclePostModel).where(and_(*conditions))
        )
        total = (await self._session.execute(count_stmt)).scalar_one()
        list_stmt = (
            select(CirclePostModel)
            .where(and_(*conditions))
            .order_by(CirclePostModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(list_stmt)
        items = [_map_post(m) for m in result.scalars().all()]
        return items, total

    async def list_posts_since(
        self,
        user_id: UUID,
        since: datetime | None,
        skip: int = 0,
        limit: int = 10000,
    ) -> tuple[list[CirclePost], int]:
        from src.infrastructure.adapters.driven.database import (
            CircleMemberModel,
            CirclePostModel,
        )

        # Posts from circles the user is a member of
        conditions = [
            CirclePostModel.deleted_at.is_(None),
            CirclePostModel.circle_id == CircleMemberModel.circle_id,
            CircleMemberModel.user_id == user_id,
            CircleMemberModel.deleted_at.is_(None),
        ]
        if since:
            conditions.append(CirclePostModel.updated_at > since)

        count_stmt = (
            select(func.count())
            .select_from(CirclePostModel)
            .join(CircleMemberModel, and_(*conditions[:3]))
            .where(and_(conditions[0], conditions[3]))
        )
        total = (await self._session.execute(count_stmt)).scalar_one()

        list_stmt = (
            select(CirclePostModel)
            .join(CircleMemberModel, and_(*conditions[:3]))
            .where(and_(conditions[0], conditions[3]))
            .order_by(CirclePostModel.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(list_stmt)
        items = [_map_post(m) for m in result.scalars().all()]
        return items, total

    async def update_post(self, post: CirclePost) -> CirclePost:
        from src.infrastructure.adapters.driven.database import CirclePostModel

        stmt = (
            update(CirclePostModel)
            .where(CirclePostModel.id == post.id)
            .values(
                caption=post.caption,
                is_visible_link=post.is_visible_link,
                like_count=post.like_count,
                comment_count=post.comment_count,
                updated_at=utc_now(),
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_post_by_id(post.id)

    async def soft_delete_post(self, post_id: UUID) -> None:
        from src.infrastructure.adapters.driven.database import CirclePostModel

        stmt = (
            update(CirclePostModel)
            .where(CirclePostModel.id == post_id)
            .values(deleted_at=utc_now(), updated_at=utc_now())
        )
        await self._session.execute(stmt)
        await self._session.flush()

    # ── CircleComment ─────────────────────────────────────────

    async def save_comment(self, comment: CircleComment) -> CircleComment:
        from src.infrastructure.adapters.driven.database import CircleCommentModel

        model = CircleCommentModel(
            id=comment.id,
            post_id=comment.post_id,
            author_id=comment.author_id,
            content=comment.content,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return _map_comment(model)

    async def get_comment_by_id(self, comment_id: UUID) -> CircleComment | None:
        from src.infrastructure.adapters.driven.database import CircleCommentModel

        stmt = select(CircleCommentModel).where(
            CircleCommentModel.id == comment_id,
            CircleCommentModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return _map_comment(model) if model else None

    async def list_comments(self, post_id: UUID) -> list[CircleComment]:
        from src.infrastructure.adapters.driven.database import CircleCommentModel

        stmt = (
            select(CircleCommentModel)
            .where(
                CircleCommentModel.post_id == post_id,
                CircleCommentModel.deleted_at.is_(None),
            )
            .order_by(CircleCommentModel.created_at.asc())
        )
        result = await self._session.execute(stmt)
        return [_map_comment(m) for m in result.scalars().all()]

    async def soft_delete_comment(self, comment_id: UUID) -> None:
        from src.infrastructure.adapters.driven.database import CircleCommentModel

        stmt = (
            update(CircleCommentModel)
            .where(CircleCommentModel.id == comment_id)
            .values(deleted_at=utc_now(), updated_at=utc_now())
        )
        await self._session.execute(stmt)
        await self._session.flush()

    # ── CircleLike ────────────────────────────────────────────

    async def save_like(self, like: CircleLike) -> CircleLike:
        from src.infrastructure.adapters.driven.database import CircleLikeModel

        model = CircleLikeModel(
            id=like.id,
            post_id=like.post_id,
            user_id=like.user_id,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return like

    async def remove_like(self, post_id: UUID, user_id: UUID) -> None:
        from src.infrastructure.adapters.driven.database import CircleLikeModel

        stmt = (
            update(CircleLikeModel)
            .where(
                CircleLikeModel.post_id == post_id,
                CircleLikeModel.user_id == user_id,
            )
            .values(deleted_at=utc_now(), updated_at=utc_now())
        )
        await self._session.execute(stmt)
        await self._session.flush()
