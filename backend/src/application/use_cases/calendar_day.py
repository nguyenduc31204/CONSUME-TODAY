"""
CalendarDayUseCase — Chi tiết transactions trong 1 ngày.
"""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import and_, select

from src.application.dtos.response.calendar_dto import (
    CalendarDayResponse,
    TransactionInDay,
)
from src.infrastructure.adapters.driven.database import (
    AsyncSession,
    CategoryModel,
    TransactionModel,
)


async def get_calendar_day(
    db: AsyncSession,
    user_id: UUID,
    day_date: date,
) -> CalendarDayResponse:
    """
    Lấy chi tiết transactions trong 1 ngày cụ thể.
    Trả về transactions + tổng chi tiêu / thu nhập.
    """
    start_dt = datetime.combine(day_date, datetime.min.time())
    end_dt = datetime.combine(day_date, datetime.max.time())

    # Query transactions with category join
    stmt = (
        select(TransactionModel, CategoryModel.name.label("cat_name"),
               CategoryModel.icon.label("cat_icon"), CategoryModel.color.label("cat_color"))
        .outerjoin(
            CategoryModel,
            TransactionModel.category_id == CategoryModel.id,
        )
        .where(
            and_(
                TransactionModel.user_id == user_id,
                TransactionModel.deleted_at.is_(None),
                TransactionModel.transaction_date >= start_dt,
                TransactionModel.transaction_date <= end_dt,
            )
        )
        .order_by(TransactionModel.transaction_date.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    transactions: list[TransactionInDay] = []
    total_expense = 0
    total_income = 0

    for row in rows:
        tx: TransactionModel = row[0]
        tx_dict = {
            "id": str(tx.id),
            "image_url": tx.image_url,
            "thumbnail_url": tx.thumbnail_url,
            "amount": tx.amount,
            "merchant_name": tx.merchant_name,
            "category_name": row.cat_name,
            "category_icon": row.cat_icon,
            "category_color": row.cat_color,
            "is_life_log": tx.is_life_log,
            "transaction_date": tx.transaction_date.isoformat() if tx.transaction_date else None,
        }
        transactions.append(TransactionInDay(**tx_dict))

        if tx.is_life_log:
            pass  # Life log không tính vào tổng
        elif tx.is_income:
            total_income += tx.amount
        else:
            total_expense += tx.amount

    return CalendarDayResponse(
        date=day_date.strftime("%Y-%m-%d"),
        total_expense=total_expense,
        total_income=total_income,
        transaction_count=len(transactions),
        transactions=transactions,
    )
