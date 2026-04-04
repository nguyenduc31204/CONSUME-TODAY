"""
CreateTaskUseCase — Create a new task.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.request.task_dto import CreateTaskRequest
from src.application.dtos.response.task_dto import TaskItem
from src.domain.entities.task import Task
from src.domain.repositories.task_repository import TaskRepository


def _task_to_item(task: Task) -> TaskItem:
    return TaskItem(
        id=str(task.id),
        user_id=str(task.user_id),
        title=task.title,
        description=task.description,
        due_date=task.due_date,
        priority=task.priority,
        status=task.status,
        related_transaction_id=str(task.related_transaction_id)
        if task.related_transaction_id
        else None,
        related_circle_post_id=str(task.related_circle_post_id)
        if task.related_circle_post_id
        else None,
        reminder_at=task.reminder_at,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


async def create_task(
    db: AsyncSession,
    user_id: UUID,
    data: CreateTaskRequest,
) -> TaskItem:
    """
    Create a new task for the user.
    """
    repo: TaskRepository = _get_repo(db)

    task = Task(
        user_id=user_id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        priority=data.priority,
        status=Task.STATUS_PENDING,
        related_transaction_id=UUID(data.related_transaction_id)
        if data.related_transaction_id
        else None,
        related_circle_post_id=UUID(data.related_circle_post_id)
        if data.related_circle_post_id
        else None,
        reminder_at=data.reminder_at,
        id=None,
    )

    saved = await repo.save(task)
    return _task_to_item(saved)


def _get_repo(db: AsyncSession) -> TaskRepository:
    from src.infrastructure.adapters.driven.task_repository_impl import (
        TaskRepositoryImpl,
    )

    return TaskRepositoryImpl(db)
