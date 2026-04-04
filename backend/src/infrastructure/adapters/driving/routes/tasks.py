"""
Task Routes — Personal task management.
POST   /api/v1/tasks
GET    /api/v1/tasks
GET    /api/v1/tasks/:id
PATCH  /api/v1/tasks/:id
PATCH  /api/v1/tasks/:id/complete
DELETE /api/v1/tasks/:id
"""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.request.task_dto import (
    CompleteTaskRequest,
    CreateTaskRequest,
    UpdateTaskRequest,
)
from src.application.use_cases.complete_task import complete_task
from src.application.use_cases.create_task import create_task
from src.application.use_cases.delete_task import delete_task
from src.application.use_cases.get_task import get_task
from src.application.use_cases.list_tasks import list_tasks
from src.application.use_cases.update_task import update_task
from src.infrastructure.adapters.driven.database import get_db
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.shared.exceptions import ForbiddenException, NotFoundException

router = APIRouter()


def _get_user_id(authorization: str = Header(...)) -> UUID:
    if not authorization.startswith("Bearer "):
        raise ForbiddenException(message="Missing Bearer token.")
    token = authorization[7:]
    user_id = JWTService().verify_access_token(token)
    if user_id is None:
        raise ForbiddenException(message="Invalid access token.")
    return user_id


# ── POST /tasks ─────────────────────────────────────────────────


@router.get("/tasks", response_model=dict)
async def list_tasks_route(
    status: str | None = Query(None),
    due_date: date | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    List tasks for the authenticated user.
    Filter by status (pending | in_progress | completed | cancelled) or due_date.
    """
    result = await list_tasks(
        db=db,
        user_id=user_id,
        status=status,
        due_date=due_date,
        limit=limit,
        offset=offset,
    )
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }


# ── POST /tasks ─────────────────────────────────────────────────


@router.post("/tasks", response_model=dict, status_code=201)
async def create_task_route(
    data: CreateTaskRequest,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new task.
    """
    result = await create_task(db=db, user_id=user_id, data=data)
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "Task created",
    }


# ── GET /tasks/:id ──────────────────────────────────────────────


@router.get("/tasks/{task_id}", response_model=dict)
async def get_task_route(
    task_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a task by ID.
    """
    result = await get_task(db=db, task_id=task_id)
    if not result:
        raise NotFoundException(message="Task not found.")
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }


# ── PATCH /tasks/:id ────────────────────────────────────────────


@router.patch("/tasks/{task_id}", response_model=dict)
async def update_task_route(
    task_id: UUID,
    data: UpdateTaskRequest,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a task (title, description, due_date, priority, status, reminder).
    Only the task owner can update.
    """
    result = await update_task(db=db, task_id=task_id, user_id=user_id, data=data)
    if not result:
        raise NotFoundException(message="Task not found.")
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "Task updated",
    }


# ── PATCH /tasks/:id/complete ──────────────────────────────────


@router.patch("/tasks/{task_id}/complete", response_model=dict)
async def complete_task_route(
    task_id: UUID,
    data: CompleteTaskRequest = CompleteTaskRequest(),
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a task as completed (or reopen with completed=false).
    Only the task owner can complete.
    """
    result = await complete_task(
        db=db, task_id=task_id, user_id=user_id, completed=data.completed
    )
    if not result:
        raise NotFoundException(message="Task not found.")
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "Task completed" if data.completed else "Task reopened",
    }


# ── DELETE /tasks/:id ──────────────────────────────────────────


@router.delete("/tasks/{task_id}", response_model=dict)
async def delete_task_route(
    task_id: UUID,
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Soft-delete a task. Only the task owner can delete.
    """
    deleted = await delete_task(db=db, task_id=task_id, user_id=user_id)
    if not deleted:
        raise NotFoundException(message="Task not found.")
    return {
        "success": True,
        "data": None,
        "message": "Task deleted",
    }
