"""
Add is_manual + transaction_time to transactions.

Revision ID: 011
Revises: 010
Create Date: 2026-04-04
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("is_manual", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "transactions",
        sa.Column("transaction_time", sa.Time(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("transactions", "transaction_time")
    op.drop_column("transactions", "is_manual")
