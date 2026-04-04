"""
CircleCalendarDayUseCase — Chi tiết kỷ niệm trong 1 ngày của Circle.
"""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import and_, select

from src.application.dtos.response.circle_calendar_dto import (
    CircleCalendarDayResponse,
    CirclePostInDay,
)
from src.infrastructure.adapters.driven.database import AsyncSession, CirclePostModel


async def get_circle_calendar_day(
    db: AsyncSession,
    circle_id: UUID,
    day_date: date,
) -> CircleCalendarDayResponse:
    """
    Lấy chi tiết kỷ niệm trong 1 ngày cụ thể của Circle.
    """
    start_dt = datetime.combine(day_date, datetime.min.time())
    end_dt = datetime.combine(day_date, datetime.max.time())

    stmt = (
        select(CirclePostModel)
        .where(
            and_(
                CirclePostModel.circle_id == circle_id,
                CirclePostModel.deleted_at.is_(None),
                CirclePostModel.created_at >= start_dt,
                CirclePostModel.created_at <= end_dt,
            )
        )
        .order_by(CirclePostModel.created_at.desc())
    )
    result = await db.execute(stmt)
    posts = result.scalars().all()

    items: list[CirclePostInDay] = [
        CirclePostInDay(
            id=str(p.id),
            image_url=p.image_url,
            thumbnail_url=None,
            caption=p.caption,
            like_count=p.like_count,
            comment_count=p.comment_count,
            author_name="",  # filled by caller
            created_at=p.created_at,
        )
        for p in posts
    ]

    return CircleCalendarDayResponse(
        date=day_date.strftime("%Y-%m-%d"),
        post_count=len(items),
        posts=items,
    )
