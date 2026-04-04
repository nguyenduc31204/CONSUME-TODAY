"""
CalendarMonthUseCase — Số kỷ niệm mỗi ngày trong tháng.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, func, select

from src.application.dtos.response.calendar_dto import (
    CalendarDayData,
    CalendarMonthResponse,
)
from src.infrastructure.adapters.driven.database import AsyncSession, TransactionModel


async def get_calendar_month(
    db: AsyncSession,
    user_id: UUID,
    year: int,
    month: int,
) -> CalendarMonthResponse:
    """
    Lấy số kỷ niệm mỗi ngày trong tháng.
    Trả về count + up to 3 thumbnails per day.
    """
    import calendar as cal

    # Tính ngày đầu/tháng cuối tháng
    _, last_day = cal.monthrange(year, month)
    start_dt = datetime(year, month, 1, 0, 0, 0)
    end_dt = datetime(year, month, last_day, 23, 59, 59)

    # Query: count per day
    count_stmt = (
        select(
            func.date(TransactionModel.transaction_date).label("txn_date"),
            func.count(TransactionModel.id).label("count"),
        )
        .where(
            and_(
                TransactionModel.user_id == user_id,
                TransactionModel.deleted_at.is_(None),
                TransactionModel.transaction_date >= start_dt,
                TransactionModel.transaction_date <= end_dt,
            )
        )
        .group_by(func.date(TransactionModel.transaction_date))
        .order_by(func.date(TransactionModel.transaction_date))
    )
    count_result = await db.execute(count_stmt)
    count_rows = count_result.all()

    date_count: dict[str, int] = {}
    for row in count_rows:
        date_str = str(row.txn_date) if row.txn_date else ""
        date_count[date_str] = int(row.count)

    # Query: thumbnails per day (max 3 per day)
    thumb_stmt = (
        select(
            func.date(TransactionModel.transaction_date).label("txn_date"),
            TransactionModel.thumbnail_url,
        )
        .where(
            and_(
                TransactionModel.user_id == user_id,
                TransactionModel.deleted_at.is_(None),
                TransactionModel.transaction_date >= start_dt,
                TransactionModel.transaction_date <= end_dt,
                TransactionModel.thumbnail_url.isnot(None),
            )
        )
        .order_by(func.date(TransactionModel.transaction_date))
    )
    thumb_result = await db.execute(thumb_stmt)
    thumb_rows = thumb_result.all()

    # Group thumbnails by date (max 3 per date)
    date_thumbs: dict[str, list[str]] = {}
    for row in thumb_rows:
        date_str = str(row.txn_date) if row.txn_date else ""
        if row.thumbnail_url:
            if date_str not in date_thumbs:
                date_thumbs[date_str] = []
            if len(date_thumbs[date_str]) < 3:
                date_thumbs[date_str].append(row.thumbnail_url)

    # Build days array for the entire month
    days: list[CalendarDayData] = []
    for d in range(1, last_day + 1):
        date_str = f"{year:04d}-{month:02d}-{d:02d}"
        days.append(
            CalendarDayData(
                date=date_str,
                count=date_count.get(date_str, 0),
                thumbnails=date_thumbs.get(date_str, []),
            )
        )

    return CalendarMonthResponse(year=year, month=month, days=days)
