"""
Response DTOs — Circle Calendar API responses.
"""

from datetime import datetime

from pydantic import BaseModel


class CirclePostCalendarDay(BaseModel):
    """Số kỷ niệm và thumbnails cho 1 ngày trong Circle."""

    date: str  # "YYYY-MM-DD"
    count: int
    thumbnails: list[str] = []  # up to 3 thumbnail URLs


class CircleCalendarMonthResponse(BaseModel):
    """Response for GET /api/v1/circles/:id/posts/calendar."""

    year: int
    month: int
    days: list[CirclePostCalendarDay]


class CirclePostInDay(BaseModel):
    """Post rút gọn cho hiển thị trong circle calendar day."""

    id: str
    image_url: str | None = None
    thumbnail_url: str | None = None
    caption: str | None = None
    like_count: int = 0
    comment_count: int = 0
    author_name: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}


class CircleCalendarDayResponse(BaseModel):
    """Response for GET /api/v1/circles/:id/posts/calendar/day."""

    date: str  # "YYYY-MM-DD"
    post_count: int = 0
    posts: list[CirclePostInDay] = []
