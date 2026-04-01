"""
Unit tests for Money value object.
"""
import pytest
from src.domain.value_objects.money import Money


class TestMoney:
    """Test suite for Money value object."""

    def test_create_vnd_money(self):
        """Money.vnd() should create VND money."""
        money = Money.vnd(75000)
        assert money.amount == 75000
        assert money.currency == "VND"

    def test_zero_money(self):
        """Money.zero() should create zero money."""
        money = Money.zero()
        assert money.amount == 0
        assert money.is_zero

    def test_is_positive(self):
        """is_positive should return True for positive amounts."""
        assert Money.vnd(1).is_positive
        assert not Money.vnd(0).is_positive
        # Note: Money.vnd(-1) raises ValueError — validation is correct

    def test_add(self):
        """add() should add two money amounts."""
        total = Money.vnd(50000).add(Money.vnd(25000))
        assert total.amount == 75000
        assert total.currency == "VND"

    def test_add_currencies_must_match(self):
        """add() should raise ValueError for different currencies."""
        vnd = Money(amount=1000, currency="VND")
        usd = Money(amount=10, currency="USD")
        with pytest.raises(ValueError):
            vnd.add(usd)

    def test_subtract(self):
        """subtract() should subtract money."""
        diff = Money.vnd(75000).subtract(Money.vnd(25000))
        assert diff.amount == 50000

    def test_subtract_cannot_go_negative(self):
        """subtract() should raise ValueError if result is negative."""
        with pytest.raises(ValueError):
            Money.vnd(10000).subtract(Money.vnd(20000))

    def test_immutability(self):
        """Money should be immutable (frozen dataclass)."""
        money = Money.vnd(10000)
        with pytest.raises(AttributeError):
            money.amount = 20000

    def test_equality(self):
        """Two money with same amount and currency should be equal."""
        a = Money.vnd(75000)
        b = Money.vnd(75000)
        assert a == b

    def test_repr(self):
        """repr() should show amount and currency."""
        money = Money.vnd(75000)
        assert "75,000" in repr(money)
        assert "VND" in repr(money)
