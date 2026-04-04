"""
CircleLike Entity — Represents a like on a CirclePost.
"""

from uuid import UUID

from src.domain.entities.base import BaseEntity


class CircleLike(BaseEntity):
    """CircleLike entity — a like on a circle post."""

    def __init__(
        self,
        *,
        post_id: UUID,
        user_id: UUID,
        id: UUID | None = None,
        created_at=None,
        updated_at=None,
        deleted_at=None,
    ) -> None:
        super().__init__(
            id=id,
            created_at=created_at,
            updated_at=updated_at,
            deleted_at=deleted_at,
        )
        self.post_id = post_id
        self.user_id = user_id
