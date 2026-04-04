"""
Task Entity — Personal task management linked to transactions/circles.
"""

from datetime import UTC, date, datetime
from uuid import UUID

from src.domain.entities.base import BaseEntity


class Task(BaseEntity):
    """Task entity — personal task with priority, due date, and optional related entity."""

    # Priority constants
    PRIORITY_LOW = "low"
    PRIORITY_MEDIUM = "medium"
    PRIORITY_HIGH = "high"
    PRIORITY_URGENT = "urgent"
    VALID_PRIORITIES = {PRIORITY_LOW, PRIORITY_MEDIUM, PRIORITY_HIGH, PRIORITY_URGENT}

    # Status constants
    STATUS_PENDING = "pending"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    VALID_STATUSES = {
        STATUS_PENDING,
        STATUS_IN_PROGRESS,
        STATUS_COMPLETED,
        STATUS_CANCELLED,
    }

    def __init__(
        self,
        *,
        user_id: UUID,
        title: str,
        description: str | None = None,
        due_date: date | None = None,
        priority: str = "medium",
        status: str = "pending",
        related_transaction_id: UUID | None = None,
        related_circle_post_id: UUID | None = None,
        reminder_at: datetime | None = None,
        completed_at: datetime | None = None,
        id: UUID | None = None,
        created_at=None,
        updated_at=None,
        deleted_at=None,
    ) -> None:
        if priority not in self.VALID_PRIORITIES:
            raise ValueError(f"Invalid priority: {priority}")
        if status not in self.VALID_STATUSES:
            raise ValueError(f"Invalid status: {status}")

        self.id = id
        self.user_id = user_id
        self.title = title
        self.description = description
        self.due_date = due_date
        self.priority = priority
        self.status = status
        self.related_transaction_id = related_transaction_id
        self.related_circle_post_id = related_circle_post_id
        self.reminder_at = reminder_at
        self.completed_at = completed_at
        self.created_at = created_at
        self.updated_at = updated_at
        self.deleted_at = deleted_at

    def complete(self) -> None:
        """Mark task as completed."""
        if self.status == self.STATUS_CANCELLED:
            raise ValueError("Cannot complete a cancelled task.")
        self.status = self.STATUS_COMPLETED
        self.completed_at = datetime.now(UTC)

    def uncomplete(self) -> None:
        """Reopen a completed task."""
        self.status = self.STATUS_PENDING
        self.completed_at = None

    def update_status(self, status: str) -> None:
        """Update task status."""
        if status not in self.VALID_STATUSES:
            raise ValueError(f"Invalid status: {status}")
        if status == self.STATUS_COMPLETED:
            self.complete()
        else:
            self.status = status
            if status != self.STATUS_COMPLETED:
                self.completed_at = None

    def reschedule(self, due_date: date | None) -> None:
        """Reschedule task to a new due date."""
        self.due_date = due_date
