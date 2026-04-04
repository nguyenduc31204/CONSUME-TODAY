"""
Add avatar_storage_key column to users table.

Revision ID: 007
Revises: 006
Create Date: 2026-04-03
"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("avatar_storage_key", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "avatar_storage_key")
