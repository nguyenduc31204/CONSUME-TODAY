"""
Category Entity — Spending/activity categories.
Each wallet owns its own set of categories (isolated per wallet).
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from dataclasses import dataclass

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


@dataclass
class Category(BaseEntity):
    """
    Category entity — belongs to a specific wallet.
    Default categories auto-created on first user login.
    """

    wallet_id: UUID
    name: str
    icon: str = "tag"  # Lucide icon name
    color: str = "#9333EA"  # memoir-purple
    emoji: str = "🏷️"  # Emoji representation
    is_default: bool = False  # True = system default category
    is_active: bool = True

    # ── Business Logic ─────────────────────────────────

    def rename(self, name: str) -> None:
        """Rename the category."""
        if not name or len(name.strip()) == 0:
            raise ValueError("Category name cannot be empty")
        self.name = name.strip()
        self.touch()

    def update_style(self, *, icon: Optional[str] = None, color: Optional[str] = None, emoji: Optional[str] = None) -> None:
        """Update category visual style."""
        if icon is not None:
            self.icon = icon
        if color is not None:
            self.color = color
        if emoji is not None:
            self.emoji = emoji
        self.touch()

    def deactivate(self) -> None:
        """Deactivate a custom category (never delete — soft delete)."""
        self.is_active = False
        self.touch()

    def __repr__(self) -> str:
        return f"<Category(id={self.id}, name={self.name}, emoji={self.emoji})>"
