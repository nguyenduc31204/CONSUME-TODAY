"""
Add password auth columns — hashed_password, email/password login.

Revision ID: 002
Revises: 001
Create Date: 2026-04-01
"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("hashed_password", sa.String(255), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("is_email_verified", sa.Boolean, default=False, nullable=False),
    )
    # Index for fast email lookup during login
    op.create_index("ix_users_hashed_password", "users", ["hashed_password"], unique=False, postgresql_where=sa.text("hashed_password IS NOT NULL"))


def downgrade() -> None:
    op.drop_index("ix_users_hashed_password", table_name="users")
    op.drop_column("users", "is_email_verified")
    op.drop_column("users", "hashed_password")
