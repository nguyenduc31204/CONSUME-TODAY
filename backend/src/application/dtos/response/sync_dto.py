"""
Response DTOs — Pydantic models for Sync API responses.
"""

from datetime import datetime

from pydantic import BaseModel


class SyncEntitySet(BaseModel):
    """A set of entity items and deleted IDs since last sync."""

    items: list[dict]
    deleted: list[str] = []


class SyncDeltaResponse(BaseModel):
    """Response for GET /api/v1/sync/delta."""

    transactions: SyncEntitySet
    circle_posts: SyncEntitySet
    circles: SyncEntitySet
    server_time: datetime


class SyncOperationResult(BaseModel):
    """Result of a single operation in a batch."""

    client_id: str
    success: bool
    server_id: str | None = None
    error: str | None = None


class SyncBatchResponse(BaseModel):
    """Response for POST /api/v1/sync/batch."""

    results: list[SyncOperationResult]
    server_time: datetime
    synced_count: int
    failed_count: int
