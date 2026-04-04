"""
Database — SQLAlchemy async setup + ORM models + session management.
Driven adapter: implements persistence concerns.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from src.config import get_settings

# ── SQLAlchemy Base ──────────────────────────────────────────


class Base(DeclarativeBase):
    """SQLAlchemy declarative base — all ORM models inherit from this."""

    pass


# ── Custom Types ──────────────────────────────────────────────


class TimeAsString(TypeDecorator):
    """
    PostgreSQL TIME column that returns "HH:MM:SS" string in Python
    instead of datetime.time — avoids psycopg2 "can't adapt type datetime.time" errors.

    Persists as native PostgreSQL TIME; reads back as "HH:MM" string.
    """

    impl = Time
    cache_ok = True

    def process_result_value(self, value, dialect) -> str | None:
        """Convert DB TIME → Python string "HH:MM"."""
        if value is None:
            return None
        return value.strftime("%H:%M")


# ── ORM Models (Infrastructure persistence models) ────────────


class UserModel(Base):
    """ORM model for User entity."""

    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_sub: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    apple_sub: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    hashed_password: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    wallets: Mapped[list["WalletModel"]] = relationship(
        "WalletModel", back_populates="user", lazy="selectin"
    )
    images: Mapped[list["ImageModel"]] = relationship(
        "ImageModel", back_populates="user", lazy="selectin"
    )
    circles: Mapped[list["CircleModel"]] = relationship(
        "CircleModel", back_populates="owner", lazy="selectin"
    )
    circle_memberships: Mapped[list["CircleMemberModel"]] = relationship(
        "CircleMemberModel", back_populates="user", lazy="selectin"
    )


class WalletModel(Base):
    """ORM model for Wallet entity."""

    __tablename__ = "wallets"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(20), default="#9333EA")
    icon: Mapped[str] = mapped_column(String(50), default="wallet")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_personal: Mapped[bool] = mapped_column(Boolean, default=True)
    balance: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    user: Mapped["UserModel"] = relationship("UserModel", back_populates="wallets")
    categories: Mapped[list["CategoryModel"]] = relationship(
        "CategoryModel", back_populates="wallet", lazy="selectin"
    )
    transactions: Mapped[list["TransactionModel"]] = relationship(
        "TransactionModel", back_populates="wallet", lazy="selectin"
    )


class CategoryModel(Base):
    """ORM model for Category entity."""

    __tablename__ = "categories"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    wallet_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    icon: Mapped[str] = mapped_column(String(50), default="tag")
    color: Mapped[str] = mapped_column(String(20), default="#9333EA")
    emoji: Mapped[str] = mapped_column(String(10), default="🏷️")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    wallet: Mapped["WalletModel"] = relationship(
        "WalletModel", back_populates="categories"
    )
    transactions: Mapped[list["TransactionModel"]] = relationship(
        "TransactionModel", back_populates="category", lazy="selectin"
    )


class TransactionModel(Base):
    """ORM model for Transaction entity."""

    __tablename__ = "transactions"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    wallet_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    merchant_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="VND")
    transaction_date: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, index=True
    )
    transaction_time: Mapped[str | None] = mapped_column(TimeAsString, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ocr_confidence: Mapped[float] = mapped_column(default=0.0)
    is_life_log: Mapped[bool] = mapped_column(Boolean, default=False)
    is_income: Mapped[bool] = mapped_column(Boolean, default=False)
    transaction_status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    user: Mapped["UserModel"] = relationship("UserModel")
    wallet: Mapped["WalletModel"] = relationship(
        "WalletModel", back_populates="transactions"
    )
    category: Mapped[Optional["CategoryModel"]] = relationship(
        "CategoryModel", back_populates="transactions"
    )

    # Indexes for common queries
    __table_args__ = (
        Index("ix_transactions_user_date", "user_id", "transaction_date"),
        Index("ix_transactions_user_wallet", "user_id", "wallet_id"),
    )


class ImageModel(Base):
    """ORM model for Image entity."""

    __tablename__ = "images"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    user: Mapped["UserModel"] = relationship("UserModel", back_populates="images")


class TaskModel(Base):
    """ORM model for Task entity."""

    __tablename__ = "tasks"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=lambda ctx: ctx.current_parameters.get("id") or uuid4(),
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    related_transaction_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("transactions.id", ondelete="SET NULL"),
        nullable=True,
    )
    related_circle_post_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("circle_posts.id", ondelete="SET NULL"),
        nullable=True,
    )
    reminder_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["UserModel"] = relationship("UserModel")
    related_transaction: Mapped["TransactionModel | None"] = relationship(
        "TransactionModel", foreign_keys=[related_transaction_id], lazy="selectin"
    )
    related_circle_post: Mapped["CirclePostModel | None"] = relationship(
        "CirclePostModel", foreign_keys=[related_circle_post_id], lazy="selectin"
    )


class CircleModel(Base):
    """ORM model for Circle entity."""

    __tablename__ = "circles"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    visibility: Mapped[str] = mapped_column(
        String(20), default="members_only", nullable=False
    )
    circle_type: Mapped[str] = mapped_column(
        String(20), default="private", nullable=False
    )
    max_members: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    owner: Mapped["UserModel"] = relationship("UserModel")
    members: Mapped[list["CircleMemberModel"]] = relationship(
        "CircleMemberModel", back_populates="circle", lazy="selectin"
    )
    posts: Mapped[list["CirclePostModel"]] = relationship(
        "CirclePostModel", back_populates="circle", lazy="selectin"
    )
    fund: Mapped["CircleFundModel | None"] = relationship(
        "CircleFundModel", back_populates="circle", uselist=False, lazy="selectin"
    )


class CircleMemberModel(Base):
    """ORM model for CircleMember entity."""

    __tablename__ = "circle_members"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    circle_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("circles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(20), default="member", nullable=False)
    member_status: Mapped[str] = mapped_column(
        String(20), default="approved", nullable=False
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    circle: Mapped["CircleModel"] = relationship(
        "CircleModel", back_populates="members"
    )
    user: Mapped["UserModel"] = relationship(
        "UserModel", back_populates="circle_memberships"
    )


class CirclePostModel(Base):
    """ORM model for CirclePost entity."""

    __tablename__ = "circle_posts"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    circle_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("circles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    ocr_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_visible_link: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    like_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comment_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    circle: Mapped["CircleModel"] = relationship("CircleModel", back_populates="posts")
    author: Mapped["UserModel"] = relationship("UserModel")
    comments: Mapped[list["CircleCommentModel"]] = relationship(
        "CircleCommentModel", back_populates="post", lazy="selectin"
    )


class CircleCommentModel(Base):
    """ORM model for CircleComment entity."""

    __tablename__ = "circle_comments"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    post_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("circle_posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    post: Mapped["CirclePostModel"] = relationship(
        "CirclePostModel", back_populates="comments"
    )
    author: Mapped["UserModel"] = relationship("UserModel")


class CircleLikeModel(Base):
    """ORM model for CircleLike entity."""

    __tablename__ = "circle_likes"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    post_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("circle_posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    liked_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class CircleFundModel(Base):
    """ORM model for CircleFund entity."""

    __tablename__ = "circle_funds"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    circle_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("circles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    balance: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_income: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_expense: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="VND", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    circle: Mapped["CircleModel"] = relationship("CircleModel")
    transactions: Mapped[list["CircleFundTransactionModel"]] = relationship(
        "CircleFundTransactionModel", back_populates="fund", lazy="selectin"
    )


class CircleFundTransactionModel(Base):
    """ORM model for CircleFundTransaction entity."""

    __tablename__ = "circle_fund_transactions"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    circle_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("circles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fund_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("circle_funds.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    merchant_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    transaction_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    transaction_time: Mapped[str | None] = mapped_column(TimeAsString, nullable=True)
    split_type: Mapped[str] = mapped_column(String(20), default="equal", nullable=False)
    split_amounts: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    paid_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    fund: Mapped["CircleFundModel"] = relationship(
        "CircleFundModel", back_populates="transactions"
    )
    author: Mapped["UserModel"] = relationship("UserModel", foreign_keys=[author_id])
    payer: Mapped["UserModel"] = relationship("UserModel", foreign_keys=[paid_by])


# ── Database Engine & Session ────────────────────────────────

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.app_env == "development",
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — get async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """Context manager version of get_db for use outside of FastAPI routes."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
