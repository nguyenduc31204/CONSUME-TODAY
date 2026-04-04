"""
SyncDeltaUseCase — Return all changes since a given timestamp.
Used by offline clients to pull fresh data from the server.
"""

from datetime import datetime
from uuid import UUID

from src.application.dtos.response.sync_dto import (
    SyncDeltaResponse,
    SyncEntitySet,
)
from src.domain.repositories.circle_repository import CircleRepository
from src.domain.repositories.transaction_repository import TransactionRepository


class SyncDeltaUseCase:
    """
    Fetch all entity changes since a given timestamp for a user.

    Returns transactions, circle_posts, and circles that were created or
    updated (but not soft-deleted) after the given timestamp.
    Also returns IDs of permanently deleted entities.
    """

    def __init__(
        self,
        transaction_repo: TransactionRepository,
        circle_repo: CircleRepository,
    ) -> None:
        self._transaction_repo = transaction_repo
        self._circle_repo = circle_repo

    async def execute(
        self,
        user_id: UUID,
        since: datetime | None = None,
    ) -> SyncDeltaResponse:
        """
        Return all changes since `since` for the given user.

        - `since=None` means first sync — return all non-deleted entities.
        - `since` is exclusive (changes AFTER this timestamp).
        """
        now = datetime.utcnow()

        # ── Transactions ──────────────────────────────────────
        tx_items, tx_total = await self._transaction_repo.list_by_user(
            user_id,
            updated_since=since,
            skip=0,
            limit=10000,  # generous limit for offline sync
        )
        # deleted transactions are not stored in the repo (soft delete hides them)
        tx_dicts = [_transaction_to_dict(t) for t in tx_items]

        # ── Circle Posts ─────────────────────────────────────
        post_items, post_total = await self._circle_repo.list_posts_since(
            user_id,
            since=since,
            skip=0,
            limit=10000,
        )
        post_dicts = [_circle_post_to_dict(p) for p in post_items]

        # ── Circles ─────────────────────────────────────────
        circle_items = await self._circle_repo.list_circles_for_user_since(
            user_id,
            since=since,
        )
        circle_dicts = [_circle_to_dict(c) for c in circle_items]

        return SyncDeltaResponse(
            transactions=SyncEntitySet(items=tx_dicts, deleted=[]),
            circle_posts=SyncEntitySet(items=post_dicts, deleted=[]),
            circles=SyncEntitySet(items=circle_dicts, deleted=[]),
            server_time=now,
        )


# ── Helpers: entity → dict ─────────────────────────────────────


def _transaction_to_dict(t) -> dict:
    """Convert Transaction entity to a JSON-serializable dict."""
    return {
        "id": str(t.id),
        "user_id": str(t.user_id),
        "wallet_id": str(t.wallet_id),
        "category_id": str(t.category_id) if t.category_id else None,
        "image_url": t.image_url,
        "thumbnail_url": t.thumbnail_url,
        "merchant_name": t.merchant_name,
        "amount": t.amount,
        "currency": t.currency,
        "transaction_date": t.transaction_date.isoformat() if t.transaction_date else None,
        "note": t.note,
        "ocr_confidence": t.ocr_confidence,
        "is_life_log": t.is_life_log,
        "is_income": t.is_income,
        "transaction_status": t.transaction_status,
        "created_at": t.created_at.isoformat(),
        "updated_at": t.updated_at.isoformat(),
    }


def _circle_post_to_dict(p) -> dict:
    return {
        "id": str(p.id),
        "circle_id": str(p.circle_id),
        "author_id": str(p.author_id),
        "image_url": p.image_url,
        "caption": p.caption,
        "ocr_data": p.ocr_data,
        "is_visible_link": p.is_visible_link,
        "like_count": p.like_count,
        "comment_count": p.comment_count,
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
    }


def _circle_to_dict(c) -> dict:
    return {
        "id": str(c.id),
        "name": c.name,
        "description": c.description,
        "cover_image_url": c.cover_image_url,
        "owner_id": str(c.owner_id),
        "visibility": c.visibility,
        "circle_type": c.circle_type,
        "max_members": c.max_members,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
    }
