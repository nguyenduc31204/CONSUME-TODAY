"""
Category Entity — Spending/activity categories.
Each wallet owns its own set of categories (isolated per wallet).
"""

from uuid import UUID

from src.domain.entities.base import BaseEntity

# ── Default Categories ──────────────────────────────────
DEFAULT_CATEGORIES = [
    {"name": "Ăn uống", "icon": "utensils", "color": "#F97316", "emoji": "🍜"},
    {"name": "Mua sắm", "icon": "shopping-bag", "color": "#EC4899", "emoji": "🛍️"},
    {"name": "Di chuyển", "icon": "car", "color": "#3B82F6", "emoji": "🚗"},
    {"name": "Giải trí", "icon": "film", "color": "#8B5CF6", "emoji": "🎬"},
    {"name": "Hóa đơn & Tiện ích", "icon": "home", "color": "#10B981", "emoji": "🏠"},
    {"name": "Sức khỏe", "icon": "pill", "color": "#EF4444", "emoji": "💊"},
]


class Category(BaseEntity):
    """Category entity — belongs to a specific wallet."""

    def __init__(
        self,
        *,
        wallet_id: UUID,
        name: str,
        icon: str = "tag",
        color: str = "#9333EA",
        emoji: str = "🏷️",
        is_default: bool = False,
        is_active: bool = True,
        id: UUID | None = None,
        created_at=None,
        updated_at=None,
        deleted_at=None,
    ) -> None:
        super().__init__(
            id=id,
            created_at=created_at,
            updated_at=updated_at,
            deleted_at=deleted_at,
        )
        self.wallet_id = wallet_id
        self.name = name
        self.icon = icon
        self.color = color
        self.emoji = emoji
        self.is_default = is_default
        self.is_active = is_active

    # ── Business Logic ─────────────────────────────────

    def rename(self, name: str) -> None:
        if not name or len(name.strip()) == 0:
            raise ValueError("Category name cannot be empty")
        self.name = name.strip()
        self.touch()

    def update_style(
        self,
        *,
        icon: str | None = None,
        color: str | None = None,
        emoji: str | None = None,
    ) -> None:
        if icon is not None:
            self.icon = icon
        if color is not None:
            self.color = color
        if emoji is not None:
            self.emoji = emoji
        self.touch()

    def deactivate(self) -> None:
        self.is_active = False
        self.touch()

    def __repr__(self) -> str:
        return f"<Category(id={self.id}, name={self.name}, emoji={self.emoji})>"
