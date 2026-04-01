"""
WalletRepository — Abstract interface for Wallet persistence.
"""
from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from src.domain.entities.wallet import Wallet


class WalletRepository(ABC):
    """
    Abstract repository interface for Wallet entity.
    """

    @abstractmethod
    async def save(self, wallet: Wallet) -> Wallet:
        """Persist a wallet."""
        ...

    @abstractmethod
    async def get_by_id(self, wallet_id: UUID) -> Optional[Wallet]:
        """Retrieve a wallet by UUID."""
        ...

    @abstractmethod
    async def get_by_user_id(self, user_id: UUID) -> list[Wallet]:
        """List all wallets for a user."""
        ...

    @abstractmethod
    async def get_default(self, user_id: UUID) -> Optional[Wallet]:
        """Get the user's default wallet."""
        ...

    @abstractmethod
    async def update(self, wallet: Wallet) -> Wallet:
        """Update an existing wallet."""
        ...

    @abstractmethod
    async def soft_delete(self, wallet_id: UUID) -> None:
        """Soft-delete a wallet."""
        ...
