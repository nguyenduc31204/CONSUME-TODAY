"""
GetTaskUseCase — Get a single task by ID.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.task_dto import TaskDetailResponse, TaskItem
from src.domain.repositories.task_repository import TaskRepository


def _task_to_item(task) -> TaskItem:
    related_tx = getattr(task, "related_transaction", None)
    related_post = getattr(task, "related_circle_post", None)
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
        related_transaction_amount=related_tx.amount if related_tx else None,
        related_transaction_merchant=related_tx.merchant_name if related_tx else None,
        related_transaction_image=related_tx.thumbnail_url or related_tx.image_url
        if related_tx
        else None,
        related_circle_post_caption=related_post.caption if related_post else None,
        related_circle_post_image=related_post.image_url if related_post else None,
    )


async def get_task(
    db: AsyncSession,
    task_id: UUID,
) -> TaskDetailResponse:
    """
    Get a task by ID.
    """
    repo: TaskRepository = _get_repo(db)
    task = await repo.get_by_id(task_id)
    if not task:
        return None
    return TaskDetailResponse(task=_task_to_item(task))


def _get_repo(db: AsyncSession) -> TaskRepository:
    from src.infrastructure.adapters.driven.task_repository_impl import (
        TaskRepositoryImpl,
    )

    return TaskRepositoryImpl(db)
