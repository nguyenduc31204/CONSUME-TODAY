"""
CircleCalendarMonthUseCase — Số kỷ niệm mỗi ngày trong tháng của Circle.
"""

import calendar as cal
from datetime import datetime

from sqlalchemy import and_, func, select

from src.application.dtos.response.circle_calendar_dto import (
    CircleCalendarMonthResponse,
    CirclePostCalendarDay,
)
from src.infrastructure.adapters.driven.database import AsyncSession, CirclePostModel


async def get_circle_calendar_month(
    db: AsyncSession,
    circle_id,
    year: int,
    month: int,
) -> CircleCalendarMonthResponse:
    """
    Lấy số kỷ niệm mỗi ngày trong tháng của Circle.
    Trả về count + up to 3 thumbnails per day.
    """
    _, last_day = cal.monthrange(year, month)
    start_dt = datetime(year, month, 1, 0, 0, 0)
    end_dt = datetime(year, month, last_day, 23, 59, 59)

    # Count per day
    count_stmt = (
        select(
            func.date(CirclePostModel.created_at).label("post_date"),
            func.count(CirclePostModel.id).label("count"),
        )
        .where(
            and_(
                CirclePostModel.circle_id == circle_id,
                CirclePostModel.deleted_at.is_(None),
                CirclePostModel.created_at >= start_dt,
                CirclePostModel.created_at <= end_dt,
            )
        )
        .group_by(func.date(CirclePostModel.created_at))
        .order_by(func.date(CirclePostModel.created_at))
    )
    count_result = await db.execute(count_stmt)
    date_count: dict[str, int] = {
        str(row.post_date): int(row.count) for row in count_result.all()
    }

    # Thumbnails per day (max 3 per day)
    thumb_stmt = (
        select(
            func.date(CirclePostModel.created_at).label("post_date"),
            CirclePostModel.image_url,
        )
        .where(
            and_(
                CirclePostModel.circle_id == circle_id,
                CirclePostModel.deleted_at.is_(None),
                CirclePostModel.created_at >= start_dt,
                CirclePostModel.created_at <= end_dt,
                CirclePostModel.image_url.isnot(None),
            )
        )
        .order_by(func.date(CirclePostModel.created_at))
    )
    thumb_result = await db.execute(thumb_stmt)

    date_thumbs: dict[str, list[str]] = {}
    for row in thumb_result.all():
        date_str = str(row.post_date)
        if row.image_url:
            date_thumbs.setdefault(date_str, [])
            if len(date_thumbs[date_str]) < 3:
                date_thumbs[date_str].append(row.image_url)

    days: list[CirclePostCalendarDay] = [
        CirclePostCalendarDay(
            date=f"{year:04d}-{month:02d}-{d:02d}",
            count=date_count.get(f"{year:04d}-{month:02d}-{d:02d}", 0),
            thumbnails=date_thumbs.get(f"{year:04d}-{month:02d}-{d:02d}", []),
        )
        for d in range(1, last_day + 1)
    ]

    return CircleCalendarMonthResponse(year=year, month=month, days=days)
