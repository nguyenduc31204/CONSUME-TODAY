"""
TaskRepositoryImpl — SQLAlchemy async implementation of TaskRepository.
Driven adapter: persistence.
"""

from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.task import Task
from src.domain.repositories.task_repository import TaskRepository
from src.infrastructure.adapters.driven.database import TaskModel
from src.infrastructure.shared.datetime_utils import to_naive


class TaskRepositoryImpl(TaskRepository):
    """SQLAlchemy implementation of TaskRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_entity(self, model: TaskModel) -> Task:
        return Task(
            id=model.id,
            user_id=model.user_id,
            title=model.title,
            description=model.description,
            due_date=model.due_date,
            priority=model.priority,
            status=model.status,
            related_transaction_id=model.related_transaction_id,
            related_circle_post_id=model.related_circle_post_id,
            reminder_at=to_naive(model.reminder_at),
            completed_at=to_naive(model.completed_at),
            created_at=to_naive(model.created_at),
            updated_at=to_naive(model.updated_at),
            deleted_at=to_naive(model.deleted_at),
        )

    def _to_model(self, entity: Task, model: TaskModel | None = None) -> TaskModel:
        if model is None:
            model = TaskModel()
        # Generate UUID in Python — don't rely on DB gen_random_uuid()
        model.id = entity.id
        model.user_id = entity.user_id
        model.title = entity.title
        model.description = entity.description
        model.due_date = entity.due_date
        model.priority = entity.priority
        model.status = entity.status
        model.related_transaction_id = entity.related_transaction_id
        model.related_circle_post_id = entity.related_circle_post_id
        model.reminder_at = to_naive(entity.reminder_at)
        model.completed_at = to_naive(entity.completed_at)
        model.created_at = to_naive(entity.created_at)
        model.updated_at = to_naive(entity.updated_at)
        model.deleted_at = to_naive(entity.deleted_at)
        return model

    async def save(self, task: Task) -> Task:
        model = self._to_model(task)
        # merge() handles both INSERT (new) and UPDATE (existing)
        merged: TaskModel = await self._session.merge(model)
        await self._session.flush()
        # Sync generated UUID back to entity
        task.id = merged.id
        return self._to_entity(merged)

    async def get_by_id(self, task_id: UUID) -> Task | None:
        stmt = select(TaskModel).where(
            TaskModel.id == task_id,
            TaskModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_user(
        self,
        user_id: UUID,
        status: str | None = None,
        due_date: date | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Task]:
        stmt = (
            select(TaskModel)
            .where(
                TaskModel.user_id == user_id,
                TaskModel.deleted_at.is_(None),
            )
            .order_by(TaskModel.due_date.asc().nullslast(), TaskModel.created_at.desc())
        )

        if status:
            stmt = stmt.where(TaskModel.status == status)
        if due_date:
            stmt = stmt.where(TaskModel.due_date == due_date)

        stmt = stmt.limit(limit).offset(offset)
        result = await self._session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def count_by_user(
        self,
        user_id: UUID,
        status: str | None = None,
    ) -> int:
        stmt = select(func.count(TaskModel.id)).where(
            TaskModel.user_id == user_id,
            TaskModel.deleted_at.is_(None),
        )
        if status:
            stmt = stmt.where(TaskModel.status == status)
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def soft_delete(self, task_id: UUID) -> None:
        stmt = (
            select(TaskModel)
            .where(TaskModel.id == task_id, TaskModel.deleted_at.is_(None))
            .with_for_update()
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            model.deleted_at = model.updated_at
