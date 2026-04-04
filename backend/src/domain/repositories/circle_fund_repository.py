"""
CircleFundRepository — Abstract interface for CircleFund persistence.
"""

from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.circle_fund import CircleFund
from src.domain.entities.circle_fund_transaction import CircleFundTransaction


class CircleFundRepository(ABC):
    """Abstract repository for CircleFund and CircleFundTransaction."""

    # ── Fund ───────────────────────────────────────────────────

    @abstractmethod
    async def save_fund(self, fund: CircleFund) -> CircleFund:
        """Create or update a CircleFund."""
        raise NotImplementedError

    @abstractmethod
    async def init_fund(self, circle_id: UUID) -> CircleFund:
        """Initialize a fund for a newly created circle (creates if not exists)."""
        raise NotImplementedError

    @abstractmethod
    async def get_fund_by_circle(self, circle_id: UUID) -> CircleFund | None:
        """Get the fund for a specific circle."""
        raise NotImplementedError

    @abstractmethod
    async def update_fund_balance(
        self,
        fund_id: UUID,
        delta_income: int = 0,
        delta_expense: int = 0,
    ) -> None:
        """Adjust fund balance by delta amounts."""
        raise NotImplementedError

    # ── Transactions ─────────────────────────────────────────────

    @abstractmethod
    async def save_fund_transaction(
        self, txn: CircleFundTransaction
    ) -> CircleFundTransaction:
        """Create or update a fund transaction."""
        raise NotImplementedError

    @abstractmethod
    async def list_fund_transactions(
        self,
        fund_id: UUID,
        month: str | None = None,  # "YYYY-MM"
        type: str | None = None,  # "expense" | "income"
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[CircleFundTransaction], int]:
        """List transactions for a fund with optional filters."""
        raise NotImplementedError

    @abstractmethod
    async def get_fund_transaction(self, txn_id: UUID) -> CircleFundTransaction | None:
        """Get a single fund transaction by ID."""
        raise NotImplementedError

    @abstractmethod
    async def delete_fund_transaction(self, txn_id: UUID) -> None:
        """Soft-delete a fund transaction."""
        raise NotImplementedError
