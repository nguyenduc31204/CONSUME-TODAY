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
    async def get_by_user_id(
        self,
        user_id: UUID,
        *,
        skip: int = 0,
        limit: int = 50,
        include_deleted: bool = False,
    ) -> list[Transaction]:
        """List transactions for a user (paginated)."""
        ...

    @abstractmethod
    async def get_by_date_range(
        self,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> list[Transaction]:
        """Get transactions within a date range."""
        ...

    @abstractmethod
    async def update(self, transaction: Transaction) -> Transaction:
        """Update an existing transaction."""
        ...

    @abstractmethod
    async def soft_delete(self, transaction_id: UUID) -> None:
        """Soft-delete a transaction."""
        ...
