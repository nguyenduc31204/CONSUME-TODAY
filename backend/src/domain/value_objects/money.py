"""
Money Value Object — Immutable representation of monetary value.
Always store as integer (cents/smallest unit) to avoid float errors.
For VND: smallest unit is 1 VND (no cents).
"""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Money:
    """
    Immutable value object representing monetary amount.
    Internally stored as integer (amount in VND = smallest unit).
    """

    amount: int  # Amount in smallest currency unit (VND)
    currency: str = "VND"

    # ── Factory Methods ─────────────────────────────────

    @classmethod
    def vnd(cls, amount: int) -> "Money":
        """Create Money in VND currency."""
        if amount < 0:
            raise ValueError("Amount cannot be negative")
        return cls(amount=amount, currency="VND")

    @classmethod
    def zero(cls) -> "Money":
        """Create zero money."""
        return cls.vnd(0)

    # ── Properties ──────────────────────────────────────

    @property
    def is_zero(self) -> bool:
        return self.amount == 0

    @property
    def is_positive(self) -> bool:
        return self.amount > 0

    # ── Operations ──────────────────────────────────────

    def add(self, other: "Money") -> "Money":
        """Add two money amounts. Currencies must match."""
        if self.currency != other.currency:
            raise ValueError(f"Cannot add {self.currency} and {other.currency}")
        return Money(amount=self.amount + other.amount, currency=self.currency)

    def subtract(self, other: "Money") -> "Money":
        """Subtract money. Result cannot be negative."""
        if self.currency != other.currency:
            raise ValueError(f"Cannot subtract {self.currency} from {other.currency}")
        result = self.amount - other.amount
        if result < 0:
            raise ValueError("Result cannot be negative")
        return Money(amount=result, currency=self.currency)

    def multiply(self, factor: float) -> "Money":
        """Multiply money by a factor."""
        if factor < 0:
            raise ValueError("Factor cannot be negative")
        return Money(amount=int(self.amount * factor), currency=self.currency)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        return self.amount == other.amount and self.currency == other.currency

    def __hash__(self) -> int:
        return hash((self.amount, self.currency))

    def __repr__(self) -> str:
        return f"Money({self.amount:,} {self.currency})"
