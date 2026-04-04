"""
Add images table for R2-stored photos.

Revision ID: 003
Revises: 002
Create Date: 2026-04-01
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "images",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("thumbnail_url", sa.Text(), nullable=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(50), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("storage_key", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_images_user_id", "images", ["user_id"], unique=False)
    op.create_index("ix_images_created_at", "images", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_images_created_at", table_name="images")
    op.drop_index("ix_images_user_id", table_name="images")
    op.drop_table("images")
