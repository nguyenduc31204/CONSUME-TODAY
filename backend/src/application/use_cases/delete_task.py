"""
DeleteTaskUseCase — Soft-delete a task.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.repositories.task_repository import TaskRepository


async def delete_task(
    db: AsyncSession,
    task_id: UUID,
    user_id: UUID,
) -> bool:
    """
    Soft-delete a task. Returns False if task not found or not owned by user.
    """
    repo: TaskRepository = _get_repo(db)
    task = await repo.get_by_id(task_id)

    if not task or str(task.user_id) != str(user_id):
        return False

    await repo.soft_delete(task_id)
    return True


def _get_repo(db: AsyncSession) -> TaskRepository:
    from src.infrastructure.adapters.driven.task_repository_impl import (
        TaskRepositoryImpl,
    )

    return TaskRepositoryImpl(db)
