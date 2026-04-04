"""
CircleRepository — Abstract interface for Circle persistence.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from src.domain.entities.circle import Circle
from src.domain.entities.circle_comment import CircleComment
from src.domain.entities.circle_like import CircleLike
from src.domain.entities.circle_member import CircleMember
from src.domain.entities.circle_post import CirclePost


class CircleRepository(ABC):
    """Abstract repository for Circle and related entities."""

    # ── Circle ──────────────────────────────────────────────

    @abstractmethod
    async def save_circle(self, circle: Circle) -> Circle: ...

    @abstractmethod
    async def get_circle_by_id(self, circle_id: UUID) -> Circle | None: ...

    @abstractmethod
    async def list_circles_for_user(self, user_id: UUID) -> list[Circle]: ...

    @abstractmethod
    async def list_circles_for_user_since(
        self, user_id: UUID, since: datetime | None
    ) -> list[Circle]: ...

    @abstractmethod
    async def update_circle(self, circle: Circle) -> Circle: ...

    @abstractmethod
    async def soft_delete_circle(self, circle_id: UUID) -> None: ...

    # ── CircleMember ─────────────────────────────────────────

    @abstractmethod
    async def save_member(self, member: CircleMember) -> CircleMember: ...

    @abstractmethod
    async def get_member(
        self, circle_id: UUID, user_id: UUID
    ) -> CircleMember | None: ...

    @abstractmethod
    async def list_members(self, circle_id: UUID) -> list[CircleMember]: ...

    @abstractmethod
    async def list_pending_members(self, circle_id: UUID) -> list[CircleMember]: ...

    @abstractmethod
    async def count_members(self, circle_id: UUID) -> int: ...

    @abstractmethod
    async def update_member_status(
        self, circle_id: UUID, user_id: UUID, status: str
    ) -> CircleMember | None: ...

    @abstractmethod
    async def remove_member(self, circle_id: UUID, user_id: UUID) -> None: ...

    # ── CirclePost ───────────────────────────────────────────

    @abstractmethod
    async def save_post(self, post: CirclePost) -> CirclePost: ...

    @abstractmethod
    async def get_post_by_id(self, post_id: UUID) -> CirclePost | None: ...

    @abstractmethod
    async def list_posts(
        self, circle_id: UUID, *, skip: int = 0, limit: int = 20
    ) -> tuple[list[CirclePost], int]: ...

    @abstractmethod
    async def list_posts_since(
        self, user_id: UUID, since: datetime | None, skip: int = 0, limit: int = 10000
    ) -> tuple[list[CirclePost], int]: ...

    @abstractmethod
    async def update_post(self, post: CirclePost) -> CirclePost: ...

    @abstractmethod
    async def soft_delete_post(self, post_id: UUID) -> None: ...

    # ── CircleComment ────────────────────────────────────────

    @abstractmethod
    async def save_comment(self, comment: CircleComment) -> CircleComment: ...

    @abstractmethod
    async def get_comment_by_id(self, comment_id: UUID) -> CircleComment | None: ...

    @abstractmethod
    async def list_comments(self, post_id: UUID) -> list[CircleComment]: ...

    @abstractmethod
    async def soft_delete_comment(self, comment_id: UUID) -> None: ...

    # ── CircleLike ────────────────────────────────────────────

    @abstractmethod
    async def save_like(self, like: CircleLike) -> CircleLike: ...

    @abstractmethod
    async def remove_like(self, post_id: UUID, user_id: UUID) -> None: ...
