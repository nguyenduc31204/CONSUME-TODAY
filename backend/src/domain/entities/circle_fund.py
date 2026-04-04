"""
CircleFund Entity — Shared financial fund for a Circle.
Each Circle has exactly one fund. Fund tracks balance, total income, and total expense.
"""

from datetime import datetime
from uuid import UUID

from src.domain.entities.base import BaseEntity


class CircleFund(BaseEntity):
    """A shared financial fund belonging to a single Circle."""

    TYPE_EXPENSE = "expense"
    TYPE_INCOME = "income"

    def __init__(
        self,
        *,
        circle_id: UUID,
        balance: int = 0,
        total_income: int = 0,
        total_expense: int = 0,
        currency: str = "VND",
        id: UUID | None = None,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
        deleted_at: datetime | None = None,
    ) -> None:
        super().__init__(
            id=id,
            created_at=created_at,
            updated_at=updated_at,
            deleted_at=deleted_at,
        )
        self.circle_id = circle_id
        self.balance = balance
        self.total_income = total_income
        self.total_expense = total_expense
        self.currency = currency

    def add_income(self, amount: int) -> None:
        """Add income to the fund (increases balance)."""
        if amount <= 0:
            raise ValueError("Income amount must be positive.")
        self.total_income += amount
        self.balance += amount
        self.touch()

    def add_expense(self, amount: int) -> None:
        """Add expense to the fund (decreases balance)."""
        if amount <= 0:
            raise ValueError("Expense amount must be positive.")
        self.total_expense += amount
        self.balance -= amount
        self.touch()

    def __repr__(self) -> str:
        return (
            f"<CircleFund(id={self.id}, circle_id={self.circle_id}, "
            f"balance={self.balance} {self.currency})>"
        )
