"""
Calendar Routes — Calendar month/day views.
GET /api/v1/calendar/month  — Số kỷ niệm mỗi ngày trong tháng
GET /api/v1/calendar/day    — Chi tiết transactions trong 1 ngày
"""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.calendar_dto import (
    CalendarDayResponse,
    CalendarMonthResponse,
)
from src.application.use_cases.calendar_day import get_calendar_day
from src.application.use_cases.calendar_month import get_calendar_month
from src.infrastructure.adapters.driven.database import get_db
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.shared.exceptions import ForbiddenException

router = APIRouter()


def _get_user_id(authorization: str = Header(...)) -> UUID:
    if not authorization.startswith("Bearer "):
        raise ForbiddenException(message="Missing Bearer token.")
    token = authorization[7:]
    user_id = JWTService().verify_access_token(token)
    if user_id is None:
        raise ForbiddenException(message="Invalid access token.")
    return user_id


# ── GET /calendar/month ────────────────────────────────────────


@router.get("/calendar/month", response_model=dict)
async def calendar_month(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy số kỷ niệm mỗi ngày trong tháng.
    Returns: { success, data: { year, month, days: [{ date, count, thumbnails }] } }
    """
    result: CalendarMonthResponse = await get_calendar_month(
        db=db,
        user_id=user_id,
        year=year,
        month=month,
    )
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }


# ── GET /calendar/day ──────────────────────────────────────────


@router.get("/calendar/day", response_model=dict)
async def calendar_day(
    date_param: date = Query(..., alias="date"),
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy chi tiết transactions trong 1 ngày cụ thể.
    Returns: { success, data: { date, total_expense, total_income, transactions } }
    """
    result: CalendarDayResponse = await get_calendar_day(
        db=db,
        user_id=user_id,
        day_date=date_param,
    )
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }
