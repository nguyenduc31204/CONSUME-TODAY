"""
Sync Routes — Offline-first sync endpoints.
GET  /api/v1/sync/delta  — pull changes since timestamp
POST /api/v1/sync/batch  — push batch of offline operations
"""

from datetime import datetime

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.request.sync_dto import SyncBatchRequest
from src.application.dtos.response.sync_dto import SyncBatchResponse, SyncDeltaResponse
from src.application.use_cases.sync_batch import SyncBatchUseCase
from src.application.use_cases.sync_delta import SyncDeltaUseCase
from src.domain.repositories.circle_repository import CircleRepository
from src.domain.repositories.transaction_repository import TransactionRepository
from src.infrastructure.adapters.driven.circle_repository_impl import (
    CircleRepositoryImpl,
)
from src.infrastructure.adapters.driven.database import get_db
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.adapters.driven.transaction_repository_impl import (
    TransactionRepositoryImpl,
)
from src.infrastructure.shared.exceptions import ForbiddenException

router = APIRouter()


def _get_user_id(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise ForbiddenException(message="Missing Bearer token.")
    token = authorization[7:]
    user_id = JWTService().verify_access_token(token)
    if user_id is None:
        raise ForbiddenException(message="Invalid access token.")
    return user_id


def _get_repos(db: AsyncSession) -> tuple[TransactionRepository, CircleRepository]:
    return TransactionRepositoryImpl(db), CircleRepositoryImpl(db)


# ── GET /sync/delta ───────────────────────────────────────────


@router.get("/sync/delta", response_model=dict)
async def sync_delta(
    since: str | None = None,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Pull all changes since `since` timestamp.

    Returns transactions, circle_posts, and circles created/updated after
    the given moment. Use this on app startup to sync offline cache.
    """
    user_id = _get_user_id(authorization)
    tx_repo, circle_repo = _get_repos(db)

    since_dt: datetime | None = None
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
        except ValueError:
            since_dt = None

    uc = SyncDeltaUseCase(tx_repo, circle_repo)
    result: SyncDeltaResponse = await uc.execute(user_id, since=since_dt)

    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": "",
    }


# ── POST /sync/batch ──────────────────────────────────────────


@router.post("/sync/batch", response_model=dict)
async def sync_batch(
    request: SyncBatchRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Push a batch of offline operations to the server.

    Operations are processed FIFO. Last-write-wins for updates.
    Returns a result per operation so the client can clean its queue.
    """
    user_id = _get_user_id(authorization)
    tx_repo, circle_repo = _get_repos(db)

    uc = SyncBatchUseCase(tx_repo, circle_repo)
    result: SyncBatchResponse = await uc.execute(
        user_id=user_id,
        operations=request.operations,
    )

    return {
        "success": True,
        "data": result.model_dump(mode="json"),
        "message": f"Synced {result.synced_count}/{len(request.operations)} operations.",
    }
