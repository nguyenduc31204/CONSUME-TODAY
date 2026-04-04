"""
CircleComment Entity — Represents a comment on a CirclePost.
"""

from uuid import UUID

from src.domain.entities.base import BaseEntity


class CircleComment(BaseEntity):
    """CircleComment entity — a comment on a circle post."""

    def __init__(
        self,
        *,
        post_id: UUID,
        author_id: UUID,
        content: str,
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
        self.author_id = author_id
        self.content = content
