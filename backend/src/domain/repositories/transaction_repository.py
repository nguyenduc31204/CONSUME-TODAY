"""
TransactionRepository — Abstract interface for Transaction persistence.
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional
from uuid import UUID

from src.domain.entities.transaction import Transaction


class TransactionRepository(ABC):
    """
    Abstract repository interface for Transaction entity.
    """

    @abstractmethod
    async def save(self, transaction: Transaction) -> Transaction:
        """Persist a transaction."""
        ...

    @abstractmethod
    async def get_by_id(self, transaction_id: UUID) -> Optional[Transaction]:
        """Retrieve a transaction by UUID."""
        ...

    @abstractmethod
    async def list_by_user(
        self,
        user_id: UUID,
        *,
        wallet_id: Optional[UUID] = None,
        category_id: Optional[UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Transaction], int]:
        """List transactions with filters and total count."""
        ...

    @abstractmethod
    async def update(self, transaction: Transaction) -> Transaction:
        """Update an existing transaction."""
        ...

    @abstractmethod
    async def soft_delete(self, transaction_id: UUID) -> None:
        """Soft-delete a transaction."""
        ...
