"""
Request DTOs — Pydantic models for Sync requests.
"""

from pydantic import BaseModel, Field


class SyncBatchOperationRequest(BaseModel):
    """A single operation in a sync batch."""

    type: str = Field(..., description="CREATE | UPDATE | DELETE")
    entity: str = Field(..., description="transaction | circle_post | comment")
    entity_id: str | None = Field(None, description="Required for UPDATE/DELETE")
    payload: dict | None = Field(None, description="Required for CREATE/UPDATE")
    client_id: str = Field(..., description="Client-generated UUID for idempotency")


class SyncBatchRequest(BaseModel):
    """Request to push a batch of offline operations to the server."""

    operations: list[SyncBatchOperationRequest] = Field(
        ..., min_length=1, max_length=100,
        description="Batch of operations (max 100 per request)"
    )


class SyncDeltaRequest(BaseModel):
    """Query params for sync delta."""

    since: str | None = Field(
        None,
        description="ISO timestamp — return changes since this moment"
    )
