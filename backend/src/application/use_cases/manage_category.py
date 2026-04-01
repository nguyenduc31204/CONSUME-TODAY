"""
ManageCategoryUseCase — Create, update, delete categories.
Auto-creates 6 default categories on first wallet creation.
"""
from uuid import UUID

from src.domain.entities.category import Category, DEFAULT_CATEGORIES
from src.domain.repositories.category_repository import CategoryRepository


class ManageCategoryUseCase:
    """
    Use case for managing categories per wallet.
    """

    def __init__(self, category_repo: CategoryRepository) -> None:
        self._repo = category_repo

    async def create_default_categories(self, wallet_id: UUID) -> list[Category]:
        """Create 6 default categories for a new wallet."""
        created = []
        for i, cat_data in enumerate(DEFAULT_CATEGORIES):
            category = Category(
                wallet_id=wallet_id,
                name=cat_data["name"],
                icon=cat_data["icon"],
                color=cat_data["color"],
                emoji=cat_data["emoji"],
                is_default=True,
            )
            saved = await self._repo.save(category)
            created.append(saved)
        return created

    async def create_category(
        self,
        wallet_id: UUID,
        name: str,
        *,
        icon: str = "tag",
        color: str = "#9333EA",
        emoji: str = "🏷️",
    ) -> Category:
        """Create a custom category."""
        category = Category(
            wallet_id=wallet_id,
            name=name.strip(),
            icon=icon,
            color=color,
            emoji=emoji,
            is_default=False,
        )
        return await self._repo.save(category)

    async def list_categories(self, wallet_id: UUID) -> list[Category]:
        """List all active categories for a wallet."""
        return await self._repo.get_by_wallet_id(wallet_id)

    async def get_category(self, category_id: UUID) -> Category:
        """Get a single category."""
        cat = await self._repo.get_by_id(category_id)
        if not cat:
            raise ValueError("Category not found")
        return cat

    async def update_category(
        self,
        category_id: UUID,
        *,
        name: str | None = None,
        icon: str | None = None,
        color: str | None = None,
        emoji: str | None = None,
    ) -> Category:
        """Update a category."""
        category = await self._repo.get_by_id(category_id)
        if not category:
            raise ValueError("Category not found")

        if name is not None:
            category.rename(name)
        if icon is not None or color is not None or emoji is not None:
            category.update_style(icon=icon, color=color, emoji=emoji)

        return await self._repo.update(category)

    async def soft_delete_category(self, category_id: UUID) -> None:
        """Deactivate a category (never hard delete)."""
        await self._repo.soft_delete(category_id)
