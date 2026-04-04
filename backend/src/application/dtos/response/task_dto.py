"""
Response DTOs — Pydantic models for Task API responses.
"""

from datetime import date, datetime

from pydantic import BaseModel


class TaskItem(BaseModel):
    """Task item in list responses."""

    id: str
    user_id: str
    title: str
    description: str | None = None
    due_date: date | None = None
    priority: str
    status: str
    related_transaction_id: str | None = None
    related_circle_post_id: str | None = None
    reminder_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    # Denormalized related data
    related_transaction_amount: int | None = None
    related_transaction_merchant: str | None = None
    related_transaction_image: str | None = None
    related_circle_post_caption: str | None = None
    related_circle_post_image: str | None = None

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    """Response for GET /api/v1/tasks (list)."""

    items: list[TaskItem]
    total: int
    limit: int
    offset: int


class TaskDetailResponse(BaseModel):
    """Response for GET /api/v1/tasks/:id."""

    task: TaskItem
