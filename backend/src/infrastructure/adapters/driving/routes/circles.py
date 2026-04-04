"""
Circle Routes — Social memory sharing (Circles).
Covers: Circle CRUD, member management, posts, comments, likes.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.request.circle_dto import (
    CreateCircleRequest,
    CreateCommentRequest,
    CreatePostRequest,
    UpdateCircleRequest,
)
from src.application.use_cases.add_comment import add_comment
from src.application.use_cases.create_circle import create_circle
from src.application.use_cases.create_post import create_post
from src.application.use_cases.delete_circle import delete_circle
from src.application.use_cases.delete_comment import delete_comment
from src.application.use_cases.delete_post import delete_post
from src.application.use_cases.get_circle import get_circle
from src.application.use_cases.invite_member import invite_member
from src.application.use_cases.join_circle import join_circle
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


@router.post("/circles/{circle_id}/join/{invite_code}", response_model=dict)
async def join_circle_route(
    circle_id: UUID,
    invite_code: str = Path(..., min_length=6, max_length=6),
    user_id: UUID = auth_dep,
    db: AsyncSession = Depends(get_db),
):
    """Tham gia Circle qua invite code."""
    joined_id = await join_circle(db=db, invite_code=invite_code, user_id=user_id)
    if not joined_id:
        raise NotFoundException(message="Invite code không hợp lệ.")
    return {
        "success": True,
        "data": {"circle_id": joined_id},
        "message": "Bạn đã tham gia nhóm.",
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
