"""
Reports Routes — Spending summary, by-category and by-day aggregations.
Phase 5: Nhìn lại + Polish.
"""

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.adapters.driven.database import get_db
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.shared.exceptions import ForbiddenException

router = APIRouter()


def _get_user_id(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise ForbiddenException(message="Missing Bearer token.")
    token = authorization[7:]
    user_id = JWTService().verify_access_token(token)
    if user_id is None:
        raise ForbiddenException(message="Invalid access token.")
    return user_id


# ── Response DTOs ──────────────────────────────────────────────


class CategorySummary(BaseModel):
    id: str | None
    name: str
    icon: str | None
    color: str | None
    amount: int
    count: int
    pct: float


class DaySummary(BaseModel):
    date: str  # YYYY-MM-DD
    amount: int
    count: int


class PeriodComparison(BaseModel):
    amount_change_pct: float | None  # null if no previous period data
    count_change_pct: float | None


class ReportSummary(BaseModel):
    total_amount: int
    total_count: int
    vs_previous_period: PeriodComparison
    by_category: list[CategorySummary]
    by_day: list[DaySummary]


# ── Helpers ─────────────────────────────────────────────────────


def _get_period_dates(period: str) -> tuple[date, date]:
    """Return (start_date, end_date) for a given period."""
    today = date.today()
    if period == "week":
        # Current rolling 7 days including today
        start = today - timedelta(days=6)
        return start, today
    elif period == "month":
        start = today.replace(day=1)
        return start, today
    elif period == "last_month":
        first_this = today.replace(day=1)
        end = first_this - timedelta(days=1)
        start = end.replace(day=1)
        return start, end
    else:
        # Default: current month
        return today.replace(day=1), today


async def _build_report_summary(
    db: AsyncSession,
    user_id: str,
    start_date: date,
    end_date: date,
    wallet_id: str | None = None,
) -> ReportSummary:
    """
    Aggregate transactions for the given period:
    - Total amount + count
    - Breakdown by category
    - Breakdown by day
    """
    from uuid import UUID as _UUID

    from src.infrastructure.adapters.driven.database import (
        CategoryModel,
        TransactionModel,
    )

    # Accept both str and UUID — FastAPI may coerce the param
    uid = _UUID(str(user_id)) if not isinstance(user_id, _UUID) else user_id
    wid = _UUID(str(wallet_id)) if wallet_id else None

    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())

    # Base conditions
    base_conds = [
        TransactionModel.user_id == uid,
        TransactionModel.deleted_at.is_(None),
        TransactionModel.transaction_status == "confirmed",
        ~TransactionModel.is_life_log,
        ~TransactionModel.is_income,  # exclude income from spending report
        TransactionModel.transaction_date >= start_dt,
        TransactionModel.transaction_date <= end_dt,
    ]
    if wid:
        base_conds.append(TransactionModel.wallet_id == wid)

    # ── Total amount + count ────────────────────────────────
    total_stmt = select(
        func.coalesce(func.sum(TransactionModel.amount), 0).label("total_amount"),
        func.count(TransactionModel.id).label("total_count"),
    ).where(and_(*base_conds))
    total_result = await db.execute(total_stmt)
    total_row = total_result.one()
    total_amount = int(total_row.total_amount)
    total_count = int(total_row.total_count)

    # ── By category ──────────────────────────────────────────
    amount_sum = func.coalesce(func.sum(TransactionModel.amount), 0).label("amount")
    by_category_stmt = (
        select(
            CategoryModel.id,
            CategoryModel.name,
            CategoryModel.icon,
            CategoryModel.color,
            amount_sum,
            func.count(TransactionModel.id).label("count"),
        )
        .join(
            CategoryModel,
            TransactionModel.category_id == CategoryModel.id,
            isouter=True,
        )
        .where(and_(*base_conds))
        .group_by(
            CategoryModel.id,
            CategoryModel.name,
            CategoryModel.icon,
            CategoryModel.color,
        )
        .order_by(amount_sum.desc())
    )
    cat_result = await db.execute(by_category_stmt)
    cat_rows = cat_result.all()

    by_category: list[CategorySummary] = []
    for row in cat_rows:
        pct = (
            round(float(row.amount) / total_amount * 100, 1)
            if total_amount > 0
            else 0.0
        )
        by_category.append(
            CategorySummary(
                id=str(row.id) if row.id else None,
                name=row.name or "Khác",
                icon=row.icon,
                color=row.color,
                amount=int(row.amount),
                count=int(row.count),
                pct=pct,
            )
        )

    # ── By day ───────────────────────────────────────────────
    # Group by date(transaction_date) — PostgreSQL compatible
    txn_date_col = func.date(TransactionModel.transaction_date)
    by_day_stmt = (
        select(
            txn_date_col.label("txn_date"),
            func.coalesce(func.sum(TransactionModel.amount), 0).label("amount"),
            func.count(TransactionModel.id).label("count"),
        )
        .where(and_(*base_conds))
        .group_by(txn_date_col)
        .order_by(txn_date_col)
    )
    day_result = await db.execute(by_day_stmt)
    day_rows = day_result.all()

    by_day: list[DaySummary] = [
        DaySummary(
            date=str(row.txn_date) if row.txn_date else "",
            amount=int(row.amount),
            count=int(row.count),
        )
        for row in day_rows
    ]

    return ReportSummary(
        total_amount=total_amount,
        total_count=total_count,
        vs_previous_period=PeriodComparison(
            amount_change_pct=None,
            count_change_pct=None,
        ),
        by_category=by_category,
        by_day=by_day,
    )


async def _compute_comparison(
    db: AsyncSession,
    user_id: str,
    start_date: date,
    end_date: date,
    wallet_id: str | None = None,
) -> PeriodComparison:
    """
    Compute percentage change vs the same-length period immediately before.
    """
    from uuid import UUID as _UUID

    from src.infrastructure.adapters.driven.database import TransactionModel

    uid = _UUID(str(user_id)) if not isinstance(user_id, _UUID) else user_id
    wid = _UUID(str(wallet_id)) if wallet_id else None

    span = (end_date - start_date).days + 1
    prev_end = start_date - timedelta(days=1)
    prev_start = prev_end - timedelta(days=span - 1)

    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    prev_start_dt = datetime.combine(prev_start, datetime.min.time())
    prev_end_dt = datetime.combine(prev_end, datetime.max.time())

    base_conds = [
        TransactionModel.user_id == uid,
        TransactionModel.deleted_at.is_(None),
        TransactionModel.transaction_status == "confirmed",
        ~TransactionModel.is_life_log,
    ]
    if wid:
        base_conds.append(TransactionModel.wallet_id == wid)

    # Current period
    curr_conds = base_conds + [
        TransactionModel.transaction_date >= start_dt,
        TransactionModel.transaction_date <= end_dt,
    ]
    curr_stmt = select(
        func.coalesce(func.sum(TransactionModel.amount), 0).label("amount"),
        func.count(TransactionModel.id).label("count"),
    ).where(and_(*curr_conds))
    curr = (await db.execute(curr_stmt)).one()

    # Previous period
    prev_conds = base_conds + [
        TransactionModel.transaction_date >= prev_start_dt,
        TransactionModel.transaction_date <= prev_end_dt,
    ]
    prev_stmt = select(
        func.coalesce(func.sum(TransactionModel.amount), 0).label("amount"),
        func.count(TransactionModel.id).label("count"),
    ).where(and_(*prev_conds))
    prev = (await db.execute(prev_stmt)).one()

    def pct_change(curr_val: int, prev_val: int) -> float | None:
        if prev_val == 0:
            return None
        return round((curr_val - prev_val) / prev_val * 100, 1)

    return PeriodComparison(
        amount_change_pct=pct_change(int(curr.amount), int(prev.amount)),
        count_change_pct=pct_change(int(curr.count), int(prev.count)),
    )


# ── Route ───────────────────────────────────────────────────────


@router.get("/reports/summary")
async def get_report_summary(
    period: str = Query("month", regex="^(week|month|last_month|custom)$"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    wallet_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
):
    """
    Spending report: total, by-category pie, by-day bar.

    Query params:
    - period: "week" | "month" | "last_month" | "custom"
    - start_date / end_date: required when period="custom"
    - wallet_id: optional filter

    Returns:
    {
      "success": true,
      "data": {
        "total_amount": int,
        "total_count": int,
        "vs_previous_period": { "amount_change_pct": float|null, "count_change_pct": float|null },
        "by_category": [{ "id", "name", "icon", "color", "amount", "count", "pct" }],
        "by_day": [{ "date": "YYYY-MM-DD", "amount", "count" }]
      },
      "message": ""
    }
    """

    if period == "custom":
        if start_date is None or end_date is None:
            raise ForbiddenException(
                message="start_date and end_date are required when period=custom"
            )
        sd, ed = start_date, end_date
    else:
        sd, ed = _get_period_dates(period)

    summary = await _build_report_summary(db, user_id, sd, ed, wallet_id)

    # Fill comparison vs previous period
    comparison = await _compute_comparison(db, user_id, sd, ed, wallet_id)
    summary.vs_previous_period = comparison

    return {
        "success": True,
        "data": summary.model_dump(),
        "message": "",
    }
