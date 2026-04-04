"""
CircleMember Entity — Represents membership of a user in a Circle.
"""

from datetime import datetime, timezone
from uuid import UUID

from src.domain.entities.base import BaseEntity


class CircleMember(BaseEntity):
    """CircleMember entity — links a user to a circle with a role."""

    ROLE_OWNER = "owner"
    ROLE_MEMBER = "member"
    STATUS_APPROVED = "approved"
    STATUS_PENDING = "pending"
    STATUS_REJECTED = "rejected"

    def __init__(
        self,
        *,
        circle_id: UUID,
        user_id: UUID,
        role: str = "member",
        status: str = "approved",
        joined_at: datetime | None = None,
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
        self.user_id = user_id
        self.role = role
        self.status = status
        self.joined_at = joined_at if joined_at is not None else datetime.now(timezone.utc)
