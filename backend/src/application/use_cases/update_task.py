"""
UpdateTaskUseCase — Update a task (title, description, due_date, priority, status, reminder).
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.request.task_dto import UpdateTaskRequest
from src.application.dtos.response.task_dto import TaskDetailResponse, TaskItem
from src.domain.entities.task import Task
from src.domain.repositories.task_repository import TaskRepository


async def update_task(
    db: AsyncSession,
    task_id: UUID,
    user_id: UUID,
    data: UpdateTaskRequest,
) -> TaskDetailResponse | None:
    """
    Update a task. Returns None if task not found or not owned by user.
    """
    repo: TaskRepository = _get_repo(db)
    task = await repo.get_by_id(task_id)

    if not task or str(task.user_id) != str(user_id):
        return None

    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.due_date is not None:
        task.due_date = data.due_date
    if data.priority is not None:
        task.update_status(data.priority)  # validate
        task.priority = data.priority
    if data.status is not None:
        task.update_status(data.status)
    if data.reminder_at is not None:
        task.reminder_at = data.reminder_at

    task.updated_at = datetime.utcnow()
    saved = await repo.save(task)

    return TaskDetailResponse(
        task=TaskItem(
            id=str(saved.id),
            user_id=str(saved.user_id),
            title=saved.title,
            description=saved.description,
            due_date=saved.due_date,
            priority=saved.priority,
            status=saved.status,
            related_transaction_id=str(saved.related_transaction_id) if saved.related_transaction_id else None,
            related_circle_post_id=str(saved.related_circle_post_id) if saved.related_circle_post_id else None,
            reminder_at=saved.reminder_at,
            completed_at=saved.completed_at,
            created_at=saved.created_at,
            updated_at=saved.updated_at,
        )
    )


def _get_repo(db: AsyncSession) -> TaskRepository:
    from src.infrastructure.adapters.driven.task_repository_impl import TaskRepositoryImpl
    return TaskRepositoryImpl(db)
