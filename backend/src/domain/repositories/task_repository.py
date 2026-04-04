"""
TaskRepository Interface — Abstract repository for Task entity.
"""

from datetime import date
from uuid import UUID

from src.domain.entities.task import Task


class TaskRepository:
    """Abstract repository for Task operations."""

    async def save(self, task: Task) -> Task:
        """Create or update a task."""
        raise NotImplementedError

    async def get_by_id(self, task_id: UUID) -> Task | None:
        """Get a task by ID."""
        raise NotImplementedError

    async def list_by_user(
        self,
        user_id: UUID,
        status: str | None = None,
        due_date: date | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Task]:
        """List tasks for a user with optional filters."""
        raise NotImplementedError

    async def count_by_user(
        self,
        user_id: UUID,
        status: str | None = None,
    ) -> int:
        """Count tasks for a user with optional status filter."""
        raise NotImplementedError

    async def soft_delete(self, task_id: UUID) -> None:
        """Soft-delete a task."""
        raise NotImplementedError
