"""
Input Port — CaptureExpenseUseCase input interface.
Driving adapters (FastAPI routes) call this.
"""

from typing import Protocol
from uuid import UUID

from src.domain.entities.transaction import Transaction


class CaptureExpenseInputPort(Protocol):
    """
    Input port for the capture expense use case.
    Driving adapters implement this protocol.
    """

    async def capture_expense(
        self,
        user_id: UUID,
        wallet_id: UUID,
        file_bytes: bytes,
        filename: str,
    ) -> Transaction:
        """
        Capture a photo, run AI OCR, and save as transaction.
        """
        ...

    async def update_transaction(
        self,
        transaction_id: UUID,
        *,
        amount: int | None = None,
        category_id: UUID | None = None,
        wallet_id: UUID | None = None,
        note: str | None = None,
    ) -> Transaction:
        """
        Update a transaction (human-in-the-loop correction).
        """
        ...
