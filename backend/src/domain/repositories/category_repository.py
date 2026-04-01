"""
CategoryRepository — Abstract interface for Category persistence.
"""
from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from src.domain.entities.category import Category


class CategoryRepository(ABC):
    """
    Abstract repository interface for Category entity.
    """

    @abstractmethod
    async def save(self, category: Category) -> Category:
        """Persist a category."""
        ...

    @abstractmethod
    async def get_by_id(self, category_id: UUID) -> Optional[Category]:
        """Retrieve a category by UUID."""
        ...

    @abstractmethod
    async def get_by_wallet_id(self, wallet_id: UUID) -> list[Category]:
        """List all categories for a wallet."""
        ...

    @abstractmethod
    async def update(self, category: Category) -> Category:
        """Update an existing category."""
        ...

    @abstractmethod
    async def soft_delete(self, category_id: UUID) -> None:
        """Soft-delete a category."""
        ...
