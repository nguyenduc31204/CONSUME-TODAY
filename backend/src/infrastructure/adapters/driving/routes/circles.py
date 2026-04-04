"""
Circle Routes — Social memory sharing (Circles).
Covers: Circle CRUD, member management, posts, comments, likes.
"""

from uuid import UUID

from datetime import date

from fastapi import APIRouter, Depends, Header, Path, Query

from src.application.dtos.response.circle_calendar_dto import CircleCalendarMonthResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.request.circle_dto import (
    CreateCircleRequest,
    CreateCommentRequest,
    CreateFundTransactionRequest,
    CreatePostRequest,
    UpdateCircleRequest,
)
from src.application.use_cases.add_comment import add_comment
from src.application.use_cases.circle_calendar_month import get_circle_calendar_month
from src.application.use_cases.create_circle import create_circle
from src.application.use_cases.create_post import create_post
from src.application.use_cases.delete_circle import delete_circle
from src.application.use_cases.delete_comment import delete_comment
from src.application.use_cases.delete_post import delete_post
from src.application.use_cases.get_circle import get_circle
from src.application.use_cases.invite_member import invite_member
from src.application.use_cases.join_circle import join_circle
from src.application.use_cases.approve_join_request import approve_join_request
from src.application.use_cases.reject_join_request import reject_join_request
from src.application.use_cases.leave_circle import leave_circle
from src.application.use_cases.list_comments import list_comments
from src.application.use_cases.list_circles import list_circles
from src.application.use_cases.list_posts import list_posts
from src.application.use_cases.remove_member import remove_member
from src.application.use_cases.toggle_like import toggle_like
from src.application.use_cases.update_circle import update_circle
from src.infrastructure.adapters.driving.routes.calendar import _get_user_id
from src.infrastructure.adapters.driven.database import get_db
from src.infrastructure.shared.exceptions import ForbiddenException, NotFoundException

router = APIRouter()


# ── Auth helper (reuse from calendar) ────────────────────────────
# Already defined in calendar.py, import here
from src.infrastructure.adapters.driving.routes.calendar import _get_user_id as _auth_user_id

auth_dep = Depends(_auth_user_id)


# ── Circle CRUD ─────────────────────────────────────────────────

@router.post("/circles", response_model=dict, status_code=201)
async def create_circle_route(
    data: CreateCircleRequest,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Tạo Circle mới."""
    result = await create_circle(db=db, user_id=user_id, data=data)
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "Circle đã được tạo.",
    }


@router.get("/circles", response_model=dict)
async def list_circles_route(
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Danh sách Circle của tôi."""
    result = await list_circles(db=db, user_id=user_id)
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }


@router.get("/circles/{circle_id}", response_model=dict)
async def get_circle_route(
    circle_id: UUID,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Chi tiết một Circle + danh sách thành viên."""
    result = await get_circle(db=db, circle_id=circle_id, user_id=user_id)
    if not result:
        raise NotFoundException(message="Circle không tìm thấy.")
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }


@router.patch("/circles/{circle_id}", response_model=dict)
async def update_circle_route(
    circle_id: UUID,
    data: UpdateCircleRequest,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Sửa Circle (chỉ owner)."""
    result = await update_circle(db=db, circle_id=circle_id, user_id=user_id, data=data)
    if not result:
        raise NotFoundException(message="Circle không tìm thấy.")
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "Circle đã được cập nhật.",
    }


@router.delete("/circles/{circle_id}", response_model=dict)
async def delete_circle_route(
    circle_id: UUID,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Xóa Circle (chỉ owner)."""
    deleted = await delete_circle(db=db, circle_id=circle_id, user_id=user_id)
    if not deleted:
        raise NotFoundException(message="Circle không tìm thấy.")
    return {
        "success": True,
        "data": None,
        "message": "Circle đã được xóa.",
    }


# ── Member Management ─────────────────────────────────────────────

@router.post("/circles/{circle_id}/invite", response_model=dict)
async def invite_member_route(
    circle_id: UUID,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Tạo invite code (chỉ owner)."""
    result = await invite_member(db=db, circle_id=circle_id, user_id=user_id)
    if not result:
        raise NotFoundException(message="Circle không tìm thấy.")
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }


@router.post("/circles/join/{invite_code}", response_model=dict)
async def join_circle_route(
    invite_code: str = Path(..., min_length=6, max_length=6),
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Tham gia Circle qua invite code. Owner tự động duyệt."""
    result = await join_circle(db=db, invite_code=invite_code, user_id=user_id)
    if not result:
        raise NotFoundException(message="Invite code không hợp lệ.")
    circle_id, approved = result
    return {
        "success": True,
        "data": {"circle_id": circle_id, "approved": approved},
        "message": "Bạn đã tham gia nhóm." if approved else "Yêu cầu tham gia đã được gửi.",
    }


@router.post("/circles/{circle_id}/approve/{target_user_id}", response_model=dict)
async def approve_join_request_route(
    circle_id: UUID,
    target_user_id: UUID,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Phê duyệt yêu cầu tham gia (chỉ owner)."""
    await approve_join_request(
        db=db, circle_id=circle_id, target_user_id=target_user_id, requester_id=user_id
    )
    return {
        "success": True,
        "data": None,
        "message": "Đã phê duyệt yêu cầu tham gia.",
    }


@router.post("/circles/{circle_id}/reject/{target_user_id}", response_model=dict)
async def reject_join_request_route(
    circle_id: UUID,
    target_user_id: UUID,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Từ chối yêu cầu tham gia (chỉ owner)."""
    await reject_join_request(
        db=db, circle_id=circle_id, target_user_id=target_user_id, requester_id=user_id
    )
    return {
        "success": True,
        "data": None,
        "message": "Đã từ chối yêu cầu tham gia.",
    }


@router.post("/circles/{circle_id}/leave", response_model=dict)
async def leave_circle_route(
    circle_id: UUID,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Rời nhóm (không áp dụng cho owner)."""
    left = await leave_circle(db=db, circle_id=circle_id, user_id=user_id)
    if not left:
        raise NotFoundException(message="Circle không tìm thấy.")
    return {
        "success": True,
        "data": None,
        "message": "Bạn đã rời nhóm.",
    }


@router.delete("/circles/{circle_id}/members/{target_user_id}", response_model=dict)
async def remove_member_route(
    circle_id: UUID,
    target_user_id: UUID,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Xóa thành viên (chỉ owner)."""
    removed = await remove_member(
        db=db, circle_id=circle_id, target_user_id=target_user_id, requester_id=user_id
    )
    if not removed:
        raise NotFoundException(message="Không tìm thấy thành viên.")
    return {
        "success": True,
        "data": None,
        "message": "Đã xóa thành viên khỏi nhóm.",
    }


# ── Posts ────────────────────────────────────────────────────────

@router.get("/circles/{circle_id}/posts", response_model=dict)
async def list_posts_route(
    circle_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Feed bài viết trong Circle."""
    result = await list_posts(
        db=db, circle_id=circle_id, viewer_id=user_id, skip=skip, limit=limit
    )
    if not result:
        raise NotFoundException(message="Circle không tìm thấy.")
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }


@router.post("/circles/{circle_id}/posts", response_model=dict, status_code=201)
async def create_post_route(
    circle_id: UUID,
    data: CreatePostRequest,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Tạo bài viết trong Circle."""
    result = await create_post(
        db=db, circle_id=circle_id, author_id=user_id, data=data
    )
    if not result:
        raise NotFoundException(message="Circle không tìm thấy.")
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "Bài viết đã được đăng.",
    }


@router.delete("/circles/{circle_id}/posts/{post_id}", response_model=dict)
async def delete_post_route(
    circle_id: UUID,
    post_id: UUID,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Xóa bài viết (author hoặc owner Circle)."""
    deleted = await delete_post(db=db, post_id=post_id, user_id=user_id)
    if not deleted:
        raise NotFoundException(message="Bài viết không tìm thấy.")
    return {
        "success": True,
        "data": None,
        "message": "Bài viết đã được xóa.",
    }


# ── Likes ────────────────────────────────────────────────────────

@router.post("/circles/{circle_id}/posts/{post_id}/like", response_model=dict)
async def toggle_like_route(
    circle_id: UUID,
    post_id: UUID,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Thích / bỏ thích bài viết."""
    result = await toggle_like(db=db, post_id=post_id, user_id=user_id)
    if not result:
        raise NotFoundException(message="Bài viết không tìm thấy.")
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }


# ── Comments ──────────────────────────────────────────────────────

@router.get("/circles/{circle_id}/posts/{post_id}/comments", response_model=dict)
async def list_comments_route(
    circle_id: UUID,
    post_id: UUID,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Lấy bình luận của bài viết."""
    result = await list_comments(db=db, post_id=post_id)
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }


@router.post("/circles/{circle_id}/posts/{post_id}/comments", response_model=dict, status_code=201)
async def add_comment_route(
    circle_id: UUID,
    post_id: UUID,
    data: CreateCommentRequest,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Thêm bình luận vào bài viết."""
    result = await add_comment(db=db, post_id=post_id, author_id=user_id, data=data)
    if not result:
        raise NotFoundException(message="Bài viết không tìm thấy.")
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "Đã bình luận.",
    }


@router.delete("/circles/{circle_id}/comments/{comment_id}", response_model=dict)
async def delete_comment_route(
    circle_id: UUID,
    comment_id: UUID,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Xóa bình luận."""
    deleted = await delete_comment(db=db, comment_id=comment_id, user_id=user_id)
    if not deleted:
        raise NotFoundException(message="Bình luận không tìm thấy.")
    return {
        "success": True,
        "data": None,
        "message": "Bình luận đã được xóa.",
    }


# ── Circle Calendar ───────────────────────────────────────────────

@router.get("/circles/{circle_id}/posts/calendar", response_model=dict)
async def circle_calendar_month_route(
    circle_id: UUID,
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Số kỷ niệm mỗi ngày trong tháng của Circle."""
    # Verify circle exists and user has access
    from src.application.use_cases.get_circle import get_circle as _get_circle

    circle = await _get_circle(db=db, circle_id=circle_id, user_id=user_id)
    if not circle:
        raise NotFoundException(message="Circle không tìm thấy.")

    result: CircleCalendarMonthResponse = await get_circle_calendar_month(
        db=db,
        circle_id=circle_id,
        year=year,
        month=month,
    )
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }


@router.get("/circles/{circle_id}/posts/calendar/day", response_model=dict)
async def circle_calendar_day_route(
    circle_id: UUID,
    date_param: date = Query(..., alias="date"),
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Chi tiết kỷ niệm trong 1 ngày của Circle."""
    from src.application.use_cases.get_circle import get_circle as _get_circle
    from src.application.use_cases.circle_calendar_day import get_circle_calendar_day
    from src.application.dtos.response.circle_calendar_dto import CircleCalendarDayResponse

    circle = await _get_circle(db=db, circle_id=circle_id, user_id=user_id)
    if not circle:
        raise NotFoundException(message="Circle không tìm thấy.")

    result: CircleCalendarDayResponse = await get_circle_calendar_day(
        db=db,
        circle_id=circle_id,
        day_date=date_param,
    )
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }


# ── Circle Fund Routes ─────────────────────────────────────────────


@router.get("/circles/{circle_id}/fund", response_model=dict)
async def get_circle_fund_route(
    circle_id: UUID,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """
    Get the shared fund for a circle.
    Only approved members and owner can view.
    """
    from src.application.use_cases.get_circle import get_circle as _get_circle
    from src.application.use_cases.get_circle_fund import init_circle_fund
    from src.application.dtos.response.circle_dto import CircleFundResponse

    circle = await _get_circle(db=db, circle_id=circle_id, user_id=user_id)
    if not circle:
        raise NotFoundException(message="Circle không tìm thấy.")

    fund = await init_circle_fund(db, circle_id)

    return {
        "success": True,
        "data": CircleFundResponse(
            id=str(fund.id),
            circle_id=str(fund.circle_id),
            balance=fund.balance,
            total_income=fund.total_income,
            total_expense=fund.total_expense,
            currency=fund.currency,
            created_at=fund.created_at,
            updated_at=fund.updated_at,
        ).model_dump(mode="json"),
        "message": "",
    }


@router.get("/circles/{circle_id}/fund/transactions", response_model=dict)
async def list_circle_fund_transactions_route(
    circle_id: UUID,
    month: str | None = Query(default=None, description="YYYY-MM"),
    type: str | None = Query(default=None, description="expense | income"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """
    List fund transactions for a circle with optional filters.
    """
    from src.application.use_cases.get_circle import get_circle as _get_circle
    from src.application.use_cases.list_circle_fund_transactions import list_circle_fund_transactions

    circle = await _get_circle(db=db, circle_id=circle_id, user_id=user_id)
    if not circle:
        raise NotFoundException(message="Circle không tìm thấy.")

    result = await list_circle_fund_transactions(
        db=db,
        circle_id=circle_id,
        month=month if (month and month not in ("undefined", "null", "")) else None,
        type=type if (type and type not in ("undefined", "null", "")) else None,
        skip=skip,
        limit=limit,
    )
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }


@router.post("/circles/{circle_id}/fund/transactions", response_model=dict)
async def add_circle_fund_transaction_route(
    circle_id: UUID,
    request: CreateFundTransactionRequest,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """
    Add an income or expense transaction to the circle's shared fund.
    Only approved members and owner can add transactions.
    """
    from src.application.use_cases.get_circle import get_circle as _get_circle
    from src.application.use_cases.add_circle_fund_transaction import add_circle_fund_transaction

    circle = await _get_circle(db=db, circle_id=circle_id, user_id=user_id)
    if not circle:
        raise NotFoundException(message="Circle không tìm thấy.")

    result = await add_circle_fund_transaction(
        db=db,
        circle_id=circle_id,
        author_id=user_id,
        data=request,
    )
    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "Giao dịch quỹ đã được thêm.",
    }


@router.delete("/circles/{circle_id}/fund/transactions/{txn_id}", response_model=dict)
async def delete_circle_fund_transaction_route(
    circle_id: UUID,
    txn_id: UUID,
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete (soft-delete) a fund transaction.
    Only the author or circle owner can delete.
    """
    from src.application.use_cases.get_circle import get_circle as _get_circle
    from src.application.use_cases.delete_circle_fund_transaction import delete_circle_fund_transaction

    circle = await _get_circle(db=db, circle_id=circle_id, user_id=user_id)
    if not circle:
        raise NotFoundException(message="Circle không tìm thấy.")

    await delete_circle_fund_transaction(
        db=db,
        circle_id=circle_id,
        txn_id=txn_id,
        user_id=user_id,
    )
    return {
        "success": True,
        "data": None,
        "message": "Đã xóa giao dịch quỹ.",
    }
