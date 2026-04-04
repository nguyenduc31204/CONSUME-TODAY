"""
Add member_status to circle_members for join request approval flow.

Revision ID: 010
Revises: 009
Create Date: 2026-04-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "circle_members",
        sa.Column("member_status", sa.String(length=20), nullable=False, server_default="approved"),
    )
    # Set all existing members (owner rows) to approved
    # Owner is determined by the owner_id in circles table, so we update all to approved
    op.execute("UPDATE circle_members SET member_status = 'approved' WHERE member_status IS NULL")
    # Set existing non-owner members (those created via join) to pending
    # We don't know which were join requests, so default them to approved for backward compat
    # (existing members were already approved by virtue of being in the DB)


def downgrade() -> None:
    op.drop_column("circle_members", "member_status")
