"""
Request DTOs — Pydantic models for Task API requests.
"""

from datetime import date, datetime

from pydantic import BaseModel, Field


class CreateTaskRequest(BaseModel):
    """Request body for POST /api/v1/tasks."""

    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    due_date: date | None = None
    priority: str = Field(default="medium")
    related_transaction_id: str | None = None
    related_circle_post_id: str | None = None
    reminder_at: datetime | None = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "title": "Mua quà sinh nhật mẹ",
                    "description": "Nhớ mua ở cửa hàng Quang Trung",
                    "due_date": "2026-04-15",
                    "priority": "high",
                }
            ]
        }
    }


class UpdateTaskRequest(BaseModel):
    """Request body for PATCH /api/v1/tasks/:id."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    due_date: date | None = None
    priority: str | None = None
    status: str | None = None
    reminder_at: datetime | None = None


class CompleteTaskRequest(BaseModel):
    """Request body for PATCH /api/v1/tasks/:id/complete."""

    completed: bool = True
