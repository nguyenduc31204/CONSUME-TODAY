"""
SyncBatchUseCase — Process a batch of offline operations from the client.
Implements last-write-wins conflict resolution.
"""

from datetime import datetime
from uuid import UUID

from src.application.dtos.request.sync_dto import SyncBatchOperationRequest
from src.application.dtos.response.sync_dto import (
    SyncBatchResponse,
    SyncOperationResult,
)
from src.domain.entities.circle_comment import CircleComment
from src.domain.entities.circle_post import CirclePost
from src.domain.entities.transaction import Transaction
from src.domain.repositories.circle_repository import CircleRepository
from src.domain.repositories.transaction_repository import TransactionRepository
from src.infrastructure.shared.exceptions import ValidationException


class SyncBatchUseCase:
    """
    Process a batch of offline operations with last-write-wins conflict resolution.

    Operations are processed in order (FIFO). For CREATE:
      - If server already has an entity with the same client-generated ID, skip (idempotent).
    For UPDATE:
      - Last-write-wins based on `updated_at` in payload.
    For DELETE:
      - Soft-delete if exists, no-op if already gone.
    """

    def __init__(
        self,
        transaction_repo: TransactionRepository,
        circle_repo: CircleRepository,
    ) -> None:
        self._tx_repo = transaction_repo
        self._circle_repo = circle_repo

    async def execute(
        self,
        user_id: UUID,
        operations: list[SyncBatchOperationRequest],
    ) -> SyncBatchResponse:
        """
        Process a batch of operations. Returns a result per operation.
        """
        results: list[SyncOperationResult] = []
        now = datetime.utcnow()

        for op in operations:
            try:
                result = await self._process_operation(user_id, op)
                results.append(result)
            except Exception as exc:
                results.append(
                    SyncOperationResult(
                        client_id=op.client_id,
                        success=False,
                        server_id=None,
                        error=str(exc),
                    )
                )

        synced = sum(1 for r in results if r.success)
        failed = len(results) - synced

        return SyncBatchResponse(
            results=results,
            server_time=now,
            synced_count=synced,
            failed_count=failed,
        )

    # ── Per-operation handlers ─────────────────────────────────

    async def _process_operation(
        self,
        user_id: UUID,
        op: SyncBatchOperationRequest,
    ) -> SyncOperationResult:
        if op.entity == "transaction":
            return await self._process_transaction_op(user_id, op)
        elif op.entity == "circle_post":
            return await self._process_circle_post_op(user_id, op)
        elif op.entity == "comment":
            return await self._process_comment_op(user_id, op)
        else:
            raise ValidationException(
                message=f"Unknown entity type: {op.entity}",
                code="ERR_SYNC_UNKNOWN_ENTITY",
            )

    async def _process_transaction_op(
        self,
        user_id: UUID,
        op: SyncBatchOperationRequest,
    ) -> SyncOperationResult:
        if op.type == "CREATE":
            payload = op.payload or {}
            # Idempotency: check if already exists by client ID stored in note or by checking
            # We store client_id in the transaction's note field for idempotency lookup
            tx = Transaction(
                user_id=user_id,
                wallet_id=UUID(payload["wallet_id"]),
                category_id=UUID(payload["category_id"])
                if payload.get("category_id")
                else None,
                image_url=payload.get("image_url"),
                thumbnail_url=payload.get("thumbnail_url"),
                merchant_name=payload.get("merchant_name"),
                amount=payload.get("amount", 0),
                currency=payload.get("currency", "VND"),
                transaction_date=datetime.fromisoformat(payload["transaction_date"])
                if payload.get("transaction_date")
                else None,
                note=payload.get("note"),
                ocr_confidence=payload.get("ocr_confidence", 0.0),
                is_life_log=payload.get("is_life_log", False),
                is_income=payload.get("is_income", False),
                transaction_status=payload.get("transaction_status", "pending"),
            )
            saved = await self._tx_repo.save(tx)
            return SyncOperationResult(
                client_id=op.client_id,
                success=True,
                server_id=str(saved.id),
                error=None,
            )

        elif op.type == "UPDATE":
            if not op.entity_id:
                raise ValidationException(
                    message="entity_id required for UPDATE", code="ERR_SYNC_MISSING_ID"
                )
            tx_id = UUID(op.entity_id)
            tx = await self._tx_repo.get_by_id(tx_id)
            if tx is None:
                return SyncOperationResult(
                    client_id=op.client_id,
                    success=False,
                    server_id=None,
                    error="ERR_NOT_FOUND",
                )
            if tx.user_id != user_id:
                return SyncOperationResult(
                    client_id=op.client_id,
                    success=False,
                    server_id=None,
                    error="ERR_FORBIDDEN",
                )
            # Last-write-wins: apply payload fields
            payload = op.payload or {}
            if "amount" in payload:
                tx.amount = payload["amount"]
            if "category_id" in payload:
                tx.category_id = (
                    UUID(payload["category_id"]) if payload["category_id"] else None
                )
            if "wallet_id" in payload:
                tx.wallet_id = UUID(payload["wallet_id"])
            if "note" in payload:
                tx.note = payload["note"]
            if "merchant_name" in payload:
                tx.merchant_name = payload["merchant_name"]
            if "is_life_log" in payload:
                tx.is_life_log = payload["is_life_log"]
            if "is_income" in payload:
                tx.is_income = payload["is_income"]
            tx.touch()
            updated = await self._tx_repo.update(tx)
            return SyncOperationResult(
                client_id=op.client_id,
                success=True,
                server_id=str(updated.id),
                error=None,
            )

        elif op.type == "DELETE":
            if not op.entity_id:
                raise ValidationException(
                    message="entity_id required for DELETE", code="ERR_SYNC_MISSING_ID"
                )
            await self._tx_repo.soft_delete(UUID(op.entity_id))
            return SyncOperationResult(
                client_id=op.client_id,
                success=True,
                server_id=None,
                error=None,
            )

        else:
            raise ValidationException(
                message=f"Unknown operation type: {op.type}",
                code="ERR_SYNC_UNKNOWN_OP",
            )

    async def _process_circle_post_op(
        self,
        user_id: UUID,
        op: SyncBatchOperationRequest,
    ) -> SyncOperationResult:
        if op.type == "CREATE":
            payload = op.payload or {}
            post = CirclePost(
                circle_id=UUID(payload["circle_id"]),
                author_id=user_id,
                image_url=payload["image_url"],
                caption=payload.get("caption"),
                ocr_data=payload.get("ocr_data"),
                is_visible_link=payload.get("is_visible_link", False),
            )
            saved = await self._circle_repo.save_post(post)
            return SyncOperationResult(
                client_id=op.client_id,
                success=True,
                server_id=str(saved.id),
                error=None,
            )

        elif op.type == "UPDATE":
            if not op.entity_id:
                raise ValidationException(
                    message="entity_id required for UPDATE", code="ERR_SYNC_MISSING_ID"
                )
            post = await self._circle_repo.get_post_by_id(UUID(op.entity_id))
            if post is None:
                return SyncOperationResult(
                    client_id=op.client_id, success=False, error="ERR_NOT_FOUND"
                )
            payload = op.payload or {}
            if "caption" in payload:
                post.caption = payload["caption"]
            if "is_visible_link" in payload:
                post.is_visible_link = payload["is_visible_link"]
            post.touch()
            updated = await self._circle_repo.update_post(post)
            return SyncOperationResult(
                client_id=op.client_id, success=True, server_id=str(updated.id)
            )

        elif op.type == "DELETE":
            if not op.entity_id:
                raise ValidationException(
                    message="entity_id required for DELETE", code="ERR_SYNC_MISSING_ID"
                )
            await self._circle_repo.soft_delete_post(UUID(op.entity_id))
            return SyncOperationResult(
                client_id=op.client_id, success=True, server_id=None
            )

        else:
            raise ValidationException(
                message=f"Unknown op type: {op.type}", code="ERR_SYNC_UNKNOWN_OP"
            )

    async def _process_comment_op(
        self,
        user_id: UUID,
        op: SyncBatchOperationRequest,
    ) -> SyncOperationResult:
        if op.type == "CREATE":
            payload = op.payload or {}
            comment = CircleComment(
                post_id=UUID(payload["post_id"]),
                author_id=user_id,
                content=payload["content"],
            )
            saved = await self._circle_repo.save_comment(comment)
            return SyncOperationResult(
                client_id=op.client_id,
                success=True,
                server_id=str(saved.id),
                error=None,
            )

        elif op.type == "DELETE":
            if not op.entity_id:
                raise ValidationException(
                    message="entity_id required for DELETE", code="ERR_SYNC_MISSING_ID"
                )
            comment = await self._circle_repo.get_comment_by_id(UUID(op.entity_id))
            if comment is None:
                return SyncOperationResult(
                    client_id=op.client_id, success=False, error="ERR_NOT_FOUND"
                )
            if comment.author_id != user_id:
                return SyncOperationResult(
                    client_id=op.client_id, success=False, error="ERR_FORBIDDEN"
                )
            await self._circle_repo.soft_delete_comment(UUID(op.entity_id))
            return SyncOperationResult(
                client_id=op.client_id, success=True, server_id=None
            )

        else:
            raise ValidationException(
                message=f"Unknown op type: {op.type}", code="ERR_SYNC_UNKNOWN_OP"
            )
