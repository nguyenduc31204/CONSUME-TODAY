"""012 — Add circle_funds and circle_fund_transactions tables.

Revision ID: 012
Revises: 011
Create Date: 2026-04-04
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers
revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Circle Funds (one fund per circle) ─────────────────────
    op.create_table(
        "circle_funds",
        sa.Column(
            "id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column("circle_id", sa.UUID(), nullable=False),
        sa.Column("balance", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("total_income", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("total_expense", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column(
            "currency", sa.String(length=3), nullable=False, server_default="VND"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_circle_fund_circle", "circle_funds", ["circle_id"])
    op.create_index(
        "idx_circle_fund_circle_active",
        "circle_funds",
        ["circle_id"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_foreign_key(
        None, "circle_funds", "circles", ["circle_id"], ["id"], ondelete="CASCADE"
    )

    # ── Circle Fund Transactions ─────────────────────────────────
    op.create_table(
        "circle_fund_transactions",
        sa.Column(
            "id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column("circle_id", sa.UUID(), nullable=False),
        sa.Column("fund_id", sa.UUID(), nullable=False),
        sa.Column("author_id", sa.UUID(), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),  # 'expense' | 'income'
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("merchant_name", sa.String(length=255), nullable=True),
        sa.Column(
            "transaction_date",
            sa.Date(),
            nullable=False,
            server_default=sa.text("CURRENT_DATE"),
        ),
        sa.Column("transaction_time", sa.Time(), nullable=True),
        sa.Column(
            "split_type",
            sa.String(length=20),
            nullable=False,
            server_default="equal",
        ),
        # 'equal'  = chia đều cho tất cả thành viên
        # 'single' = chỉ 1 người chịu (ai trả tiền)
        # 'custom' = chia tùy ý theo split_amounts
        sa.Column("split_amounts", JSONB(), nullable=True),
        # {"user_id1": 50000, "user_id2": 30000}
        sa.Column("paid_by", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_cft_fund", "circle_fund_transactions", ["fund_id"])
    op.create_index("idx_cft_circle", "circle_fund_transactions", ["circle_id"])
    op.create_index("idx_cft_date", "circle_fund_transactions", ["transaction_date"])
    op.create_foreign_key(
        None,
        "circle_fund_transactions",
        "circles",
        ["circle_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        None,
        "circle_fund_transactions",
        "circle_funds",
        ["fund_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        None, "circle_fund_transactions", "users", ["author_id"], ["id"]
    )
    op.create_foreign_key(
        None, "circle_fund_transactions", "users", ["paid_by"], ["id"]
    )


def downgrade() -> None:
    op.drop_table("circle_fund_transactions")
    op.drop_table("circle_funds")
