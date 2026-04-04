"""
Add Circles tables: circles, circle_members, circle_posts, circle_comments, circle_likes.

Revision ID: 008
Revises: 007
Create Date: 2026-04-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── circles ──────────────────────────────────────────────
    op.create_table(
        "circles",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cover_image_url", sa.Text(), nullable=True),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column(
            "visibility",
            sa.String(length=20),
            nullable=False,
            server_default="members_only",
        ),
        sa.Column(
            "circle_type",
            sa.String(length=20),
            nullable=False,
            server_default="private",
        ),
        sa.Column(
            "max_members", sa.Integer(), nullable=False, server_default="10"
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_circles_owner", "circles", ["owner_id"])
    op.create_index(
        "ix_circles_deleted",
        "circles",
        ["deleted_at"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # ── circle_members ────────────────────────────────────────
    op.create_table(
        "circle_members",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("circle_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column(
            "role", sa.String(length=20), nullable=False, server_default="member"
        ),
        sa.Column("joined_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["circle_id"], ["circles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("circle_id", "user_id", name="uq_circle_member"),
    )
    op.create_index("ix_circle_members_user", "circle_members", ["user_id"])
    op.create_index("ix_circle_members_circle", "circle_members", ["circle_id"])

    # ── circle_posts ──────────────────────────────────────────
    op.create_table(
        "circle_posts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("circle_id", sa.UUID(), nullable=False),
        sa.Column("author_id", sa.UUID(), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("ocr_data", sa.JSON(), nullable=True),
        sa.Column(
            "is_visible_link",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column(
            "like_count", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "comment_count", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["circle_id"], ["circles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_circle_posts_circle", "circle_posts", ["circle_id"])
    op.create_index("ix_circle_posts_author", "circle_posts", ["author_id"])
    op.create_index("ix_circle_posts_created", "circle_posts", ["created_at"])

    # ── circle_comments ────────────────────────────────────────
    op.create_table(
        "circle_comments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("post_id", sa.UUID(), nullable=False),
        sa.Column("author_id", sa.UUID(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["post_id"], ["circle_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_circle_comments_post", "circle_comments", ["post_id"])

    # ── circle_likes ───────────────────────────────────────────
    op.create_table(
        "circle_likes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("post_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("liked_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["post_id"], ["circle_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("post_id", "user_id", name="uq_circle_like"),
    )
    op.create_index("ix_circle_likes_post", "circle_likes", ["post_id"])
    op.create_index("ix_circle_likes_user", "circle_likes", ["user_id"])


def downgrade() -> None:
    op.drop_table("circle_likes")
    op.drop_table("circle_comments")
    op.drop_table("circle_posts")
    op.drop_table("circle_members")
    op.drop_table("circles")
