"""
Circle Entity — Represents a shared memory group (family, friends, private).
"""

from uuid import UUID

from src.domain.entities.base import BaseEntity


class Circle(BaseEntity):
    """Circle entity — a private/shared group for collaborative memory keeping."""

    VISIBILITY_MEMBERS_ONLY = "members_only"
    VISIBILITY_LINK_SHARED = "link_shared"
    TYPE_PRIVATE = "private"
    TYPE_FAMILY = "family"
    TYPE_FRIENDS = "friends"
    DEFAULT_MAX_MEMBERS = 10

    def __init__(
        self,
        *,
        name: str,
        owner_id: UUID,
        description: str | None = None,
        cover_image_url: str | None = None,
        visibility: str = "members_only",
        circle_type: str = "private",
        max_members: int = DEFAULT_MAX_MEMBERS,
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
        self.name = name
        self.owner_id = owner_id
        self.description = description
        self.cover_image_url = cover_image_url
        self.visibility = visibility
        self.circle_type = circle_type
        self.max_members = max_members

    def is_owner(self, user_id: UUID) -> bool:
        return self.owner_id == user_id

    def update_name(self, name: str) -> None:
        self.name = name
        self.touch()

    def update_description(self, description: str | None) -> None:
        self.description = description
        self.touch()

    def __repr__(self) -> str:
        return f"<Circle(id={self.id}, name={self.name})>"
