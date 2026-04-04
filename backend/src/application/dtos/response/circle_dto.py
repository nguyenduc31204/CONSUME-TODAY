"""
Response DTOs — Pydantic models for Circle API responses.
"""

from datetime import datetime

from pydantic import BaseModel


class MemberItem(BaseModel):
    """Thành viên trong Circle."""

    user_id: str
    name: str
    avatar_url: str | None = None
    role: str  # "owner" | "member"
    joined_at: datetime

    model_config = {"from_attributes": True}


class CircleItem(BaseModel):
    """Circle item trong list response."""

    id: str
    name: str
    description: str | None = None
    cover_image_url: str | None = None
    owner_id: str
    visibility: str
    circle_type: str
    max_members: int
    member_count: int
    post_count: int
    is_member: bool
    my_role: str | None  # "owner" | "member" | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CircleListResponse(BaseModel):
    """Response for GET /api/v1/circles."""

    items: list[CircleItem]
    total: int


class CircleDetailResponse(BaseModel):
    """Response for GET /api/v1/circles/:id."""

    circle: CircleItem
    members: list[MemberItem]


class CircleCreatedResponse(BaseModel):
    """Response for POST /api/v1/circles."""

    circle: CircleItem
    invite_code: str  # 6-char join code


class InviteResponse(BaseModel):
    """Response for POST /api/v1/circles/:id/invite."""

    invite_code: str
    share_url: str


class PostItem(BaseModel):
    """Bài viết trong Circle feed."""

    id: str
    circle_id: str
    author_id: str
    author_name: str
    author_avatar: str | None = None
    image_url: str
    thumbnail_url: str | None = None
    caption: str | None = None
    like_count: int
    comment_count: int
    is_liked: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PostListResponse(BaseModel):
    """Response for GET /api/v1/circles/:id/posts."""

    items: list[PostItem]
    total: int
    has_more: bool


class PostCreatedResponse(BaseModel):
    """Response for POST /api/v1/circles/:id/posts."""

    post: PostItem


class CommentItem(BaseModel):
    """Bình luận trên bài viết."""

    id: str
    post_id: str
    author_id: str
    author_name: str
    author_avatar: str | None = None
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CommentListResponse(BaseModel):
    """Response for GET /api/v1/circles/:id/posts/:postId/comments."""

    items: list[CommentItem]
    total: int


class LikeResponse(BaseModel):
    """Response for POST /api/v1/circles/:id/posts/:postId/like."""

    liked: bool
    like_count: int
