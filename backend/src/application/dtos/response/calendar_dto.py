"""
Response DTOs — Pydantic models for Calendar API responses.
"""

from pydantic import BaseModel


class CalendarDayData(BaseModel):
    """Số kỷ niệm và thumbnails cho 1 ngày."""

    date: str  # "YYYY-MM-DD"
    count: int
    thumbnails: list[str] = []  # up to 3 thumbnail URLs


class CalendarMonthResponse(BaseModel):
    """Response for GET /api/v1/calendar/month."""

    year: int
    month: int
    days: list[CalendarDayData]


class TransactionInDay(BaseModel):
    """Transaction rút gọn cho hiển thị trong calendar day."""

    id: str
    image_url: str | None = None
    thumbnail_url: str | None = None
    amount: int
    merchant_name: str | None = None
    category_name: str | None = None
    category_icon: str | None = None
    category_color: str | None = None
    is_life_log: bool = False
    transaction_date: str | None = None

    model_config = {"from_attributes": True}


class CalendarDayResponse(BaseModel):
    """Response for GET /api/v1/calendar/day."""

    date: str  # "YYYY-MM-DD"
    total_expense: int = 0
    total_income: int = 0
    transaction_count: int = 0
    transactions: list[TransactionInDay] = []
