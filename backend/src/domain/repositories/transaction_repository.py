"""
TransactionRepository — Abstract interface for Transaction persistence.
"""

from abc import ABC, abstractmethod
from datetime import datetime
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
    async def get_by_id(self, transaction_id: UUID) -> Transaction | None:
        """Retrieve a transaction by UUID."""
        ...

    @abstractmethod
    async def list_by_user(
        self,
        user_id: UUID,
        *,
        wallet_id: UUID | None = None,
        category_id: UUID | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        updated_since: datetime | None = None,
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
