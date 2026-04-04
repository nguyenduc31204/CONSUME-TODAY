"""
CirclePost Entity — Represents a memory/photo shared inside a Circle.
"""

from uuid import UUID

from src.domain.entities.base import BaseEntity


class CirclePost(BaseEntity):
    """CirclePost entity — a memory card shared within a circle."""

    def __init__(
        self,
        *,
        circle_id: UUID,
        author_id: UUID,
        image_url: str,
        caption: str | None = None,
        ocr_data: dict | None = None,
        is_visible_link: bool = False,
        like_count: int = 0,
        comment_count: int = 0,
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
        self.circle_id = circle_id
        self.author_id = author_id
        self.image_url = image_url
        self.caption = caption
        self.ocr_data = ocr_data
        self.is_visible_link = is_visible_link
        self.like_count = like_count
        self.comment_count = comment_count

    def increment_likes(self) -> None:
        self.like_count += 1
        self.touch()

    def decrement_likes(self) -> None:
        if self.like_count > 0:
            self.like_count -= 1
        self.touch()

    def increment_comments(self) -> None:
        self.comment_count += 1
        self.touch()

    def decrement_comments(self) -> None:
        if self.comment_count > 0:
            self.comment_count -= 1
        self.touch()

    def __repr__(self) -> str:
        return f"<CirclePost(id={self.id}, circle={self.circle_id})>"
