"""
Request DTOs — Pydantic models for Circle API requests.
"""

from pydantic import BaseModel, Field


class CreateCircleRequest(BaseModel):
    """Request body for POST /api/v1/circles."""

    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    visibility: str = Field(default="members_only")
    circle_type: str = Field(default="private")
    max_members: int = Field(default=10, ge=2, le=50)
    cover_image_url: str | None = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Gia đình Nguyễn",
                    "description": "Nhóm chia sẻ kỷ niệm gia đình",
                    "visibility": "members_only",
                    "circle_type": "family",
                    "max_members": 20,
                }
            ]
        }
    }


class UpdateCircleRequest(BaseModel):
    """Request body for PATCH /api/v1/circles/:id."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    visibility: str | None = None
    cover_image_url: str | None = None


class CreatePostRequest(BaseModel):
    """Request body for POST /api/v1/circles/:id/posts."""

    image_url: str
    caption: str | None = Field(default=None, max_length=500)
    ocr_data: dict | None = None
    is_visible_link: bool = False


class UpdatePostRequest(BaseModel):
    """Request body for PATCH /api/v1/circles/:id/posts/:postId."""

    caption: str | None = Field(default=None, max_length=500)
    is_visible_link: bool | None = None


class CreateCommentRequest(BaseModel):
    """Request body for POST /api/v1/circles/:id/posts/:postId/comments."""

    content: str = Field(..., min_length=1, max_length=500)


class CreateFundTransactionRequest(BaseModel):
    """Request body for POST /api/v1/circles/:id/fund/transactions."""

    type: str = Field(..., pattern="^(expense|income)$")
    amount: int = Field(..., gt=0)
    description: str | None = Field(default=None, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    merchant_name: str | None = Field(default=None, max_length=255)
    transaction_date: str | None = Field(default=None, description="YYYY-MM-DD")
    transaction_time: str | None = Field(default=None, description="HH:MM or HH:MM:SS")
    split_type: str = Field(default="equal", pattern="^(equal|single|custom)$")
    split_amounts: dict[str, int] | None = Field(default=None)
    paid_by: str | None = Field(default=None, description="User UUID who paid")
