"""
Unit tests for OCR validation domain service.
"""
import pytest
from src.domain.services.domain_service import OcrValidationService


class TestOcrValidationService:
    """Test suite for OcrValidationService."""

    def test_validate_amount_consistency_passes(self):
        """Valid when total matches sum of items."""
        total = 100000
        items = [40000, 35000, 25000]
        assert OcrValidationService.validate_amount_consistency(total, items) is True

    def test_validate_amount_consistency_within_tolerance(self):
        """Valid when total is within 1000 VND tolerance."""
        total = 100000
        items = [40000, 35000, 25000]
        # Actual sum = 100000, but let's say OCR slightly misread
        assert OcrValidationService.validate_amount_consistency(total + 500, items) is True

    def test_validate_amount_consistency_fails(self):
        """Invalid when total significantly differs from sum of items."""
        total = 100000
        items = [40000, 35000, 20000]  # sum = 95000, diff = 5000 > 1000
        assert OcrValidationService.validate_amount_consistency(total, items) is False

    def test_validate_amount_consistency_empty_items(self):
        """Valid when no items (total is 0)."""
        assert OcrValidationService.validate_amount_consistency(0, []) is True

    def test_suggest_category_coffee(self):
        """Should suggest 'Ăn uống' for coffee shops."""
        assert OcrValidationService.suggest_category("The Coffee House") == "Ăn uống"
        assert OcrValidationService.suggest_category("Starbucks VN") == "Ăn uống"
        assert OcrValidationService.suggest_category("Highland Coffee") == "Ăn uống"

    def test_suggest_category_shopping(self):
        """Should suggest 'Mua sắm' for stores."""
        assert OcrValidationService.suggest_category("WinMart Supermarket") == "Mua sắm"
        assert OcrValidationService.suggest_category("Co.opmart") == "Mua sắm"

    def test_suggest_category_transport(self):
        """Should suggest 'Di chuyển' for transport."""
        assert OcrValidationService.suggest_category("Grab Vietnam") == "Di chuyển"
        assert OcrValidationService.suggest_category("Xăng dầu Petrol") == "Di chuyển"

    def test_suggest_category_unknown(self):
        """Should return None for unknown merchants."""
        assert OcrValidationService.suggest_category("XYZ Corp LLC") is None
