"""
Request DTOs — Pydantic models for Calendar requests.
"""

from datetime import date

from pydantic import BaseModel, Field


class CalendarMonthRequest(BaseModel):
    """Query params for GET /api/v1/calendar/month."""

    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)


class CalendarDayRequest(BaseModel):
    """Query params for GET /api/v1/calendar/day."""

    date: date
