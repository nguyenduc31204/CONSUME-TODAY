"""
CircleFundTransaction Entity — An income or expense entry within a Circle's shared fund.
"""

from datetime import date, datetime
from uuid import UUID

from src.domain.entities.base import BaseEntity


class CircleFundTransaction(BaseEntity):
    """A transaction recorded in a Circle's shared fund."""

    TYPE_EXPENSE = "expense"
    TYPE_INCOME = "income"

    # Split type constants
    SPLIT_EQUAL = "equal"  # Chia đều cho tất cả thành viên
    SPLIT_SINGLE = "single"  # Chỉ 1 người chịu (ai trả tiền)
    SPLIT_CUSTOM = "custom"  # Chia tùy ý theo split_amounts

    def __init__(
        self,
        *,
        circle_id: UUID,
        fund_id: UUID,
        author_id: UUID,
        type: str,  # 'expense' | 'income'
        amount: int,
        description: str | None = None,
        category: str | None = None,
        merchant_name: str | None = None,
        transaction_date: date | None = None,
        transaction_time: str | None = None,
        split_type: str = "equal",
        split_amounts: dict[str, int] | None = None,
        paid_by: UUID | None = None,
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
        self.fund_id = fund_id
        self.author_id = author_id
        self.type = type
        self.amount = amount
        self.description = description
        self.category = category
        self.merchant_name = merchant_name
        self.transaction_date = transaction_date
        self.transaction_time = transaction_time
        self.split_type = split_type
        self.split_amounts = split_amounts
        self.paid_by = paid_by

    def is_expense(self) -> bool:
        return self.type == self.TYPE_EXPENSE

    def is_income(self) -> bool:
        return self.type == self.TYPE_INCOME

    def __repr__(self) -> str:
        return (
            f"<CircleFundTransaction(id={self.id}, type={self.type}, "
            f"amount={self.amount}, circle_id={self.circle_id})>"
        )
