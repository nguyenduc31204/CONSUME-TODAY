"""
Add transaction_status column to transactions.

Revision ID: 004
Revises: 003
Create Date: 2026-04-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("transaction_status", sa.String(20), default="pending", nullable=False),
    )
    # Index for filtering by status (e.g., get all pending transactions)
    op.create_index(
        "ix_transactions_status",
        "transactions",
        ["transaction_status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_transactions_status", table_name="transactions")
    op.drop_column("transactions", "transaction_status")
