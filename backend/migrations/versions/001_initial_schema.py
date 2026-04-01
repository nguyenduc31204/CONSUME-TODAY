"""Initial schema — users, wallets, categories, transactions

Revision ID: 001
Revises:
Create Date: 2026-04-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID

# revision identifiers
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', PGUUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('avatar_url', sa.Text, nullable=True),
        sa.Column('google_sub', sa.String(255), nullable=True, unique=True),
        sa.Column('apple_sub', sa.String(255), nullable=True, unique=True),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_google_sub', 'users', ['google_sub'])
    op.create_index('ix_users_apple_sub', 'users', ['apple_sub'])

    # Wallets table
    op.create_table(
        'wallets',
        sa.Column('id', PGUUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', PGUUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('color', sa.String(20), default='#9333EA', nullable=False),
        sa.Column('icon', sa.String(50), default='wallet', nullable=False),
        sa.Column('is_default', sa.Boolean, default=False, nullable=False),
        sa.Column('is_personal', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_wallets_user_id', 'wallets', ['user_id'])

    # Categories table
    op.create_table(
        'categories',
        sa.Column('id', PGUUID(as_uuid=True), primary_key=True),
        sa.Column('wallet_id', PGUUID(as_uuid=True), sa.ForeignKey('wallets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('icon', sa.String(50), default='tag', nullable=False),
        sa.Column('color', sa.String(20), default='#9333EA', nullable=False),
        sa.Column('emoji', sa.String(10), default='🏷️', nullable=False),
        sa.Column('is_default', sa.Boolean, default=False, nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_categories_wallet_id', 'categories', ['wallet_id'])

    # Transactions table
    op.create_table(
        'transactions',
        sa.Column('id', PGUUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', PGUUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('wallet_id', PGUUID(as_uuid=True), sa.ForeignKey('wallets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category_id', PGUUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('image_url', sa.Text, nullable=True),
        sa.Column('thumbnail_url', sa.Text, nullable=True),
        sa.Column('merchant_name', sa.String(255), nullable=True),
        sa.Column('amount', sa.Integer, default=0, nullable=False),
        sa.Column('currency', sa.String(10), default='VND', nullable=False),
        sa.Column('transaction_date', sa.DateTime, nullable=True),
        sa.Column('note', sa.Text, nullable=True),
        sa.Column('ocr_confidence', sa.Float, default=0.0, nullable=False),
        sa.Column('is_life_log', sa.Boolean, default=False, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_transactions_user_id', 'transactions', ['user_id'])
    op.create_index('ix_transactions_wallet_id', 'transactions', ['wallet_id'])
    op.create_index('ix_transactions_category_id', 'transactions', ['category_id'])
    op.create_index('ix_transactions_transaction_date', 'transactions', ['transaction_date'])
    op.create_index('ix_transactions_user_date', 'transactions', ['user_id', 'transaction_date'])


def downgrade() -> None:
    op.drop_table('transactions')
    op.drop_table('categories')
    op.drop_table('wallets')
    op.drop_table('users')
