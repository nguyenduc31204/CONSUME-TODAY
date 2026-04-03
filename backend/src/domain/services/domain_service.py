"""
DomainService — Pure domain logic that doesn't belong to a single entity.
"""

from uuid import UUID

from src.domain.entities.transaction import Transaction


class OcrValidationService:
    """
    Pure domain service for validating OCR results.
    """

    @staticmethod
    def validate_amount_consistency(
        total_amount: int,
        items_amounts: list[int],
        tolerance: int = 1000,  # 1000 VND tolerance for rounding
    ) -> bool:
        """
        Validate that total amount matches sum of items.
        Allows small tolerance for rounding errors.
        """
        items_sum = sum(items_amounts)
        return abs(total_amount - items_sum) <= tolerance

    @staticmethod
    def suggest_category(merchant_name: str) -> str | None:
        """
        Pure function to suggest category based on merchant name.
        MVP: simple keyword matching.
        """
        name_lower = merchant_name.lower()

        category_keywords = {
            "Ăn uống": [
                "cafe",
                "coffee",
                "cà phê",
                "bánh",
                "trà",
                "nhà hàng",
                "quán",
                "food",
                "eat",
                "starbucks",
                "the coffee house",
                " highlands",
            ],
            "Mua sắm": [
                "mart",
                "supermarket",
                "siêu thị",
                "winmart",
                "co.opmart",
                "big c",
                "lotte",
                "aeon",
                "lazada",
                "shopee",
            ],
            "Di chuyển": [
                "grab",
                "taxi",
                "uber",
                "gojek",
                "be",
                "xe máy",
                "petrol",
                "xăng",
                "ga",
                "tram",
            ],
            "Giải trí": ["cinema", "rạp", "game", "netflix", "spotify", "phim", "唱"],
            "Hóa đơn & Tiện ích": ["điện", "nước", "internet", "fiber", "evn"],
            "Sức khỏe": [
                "phòng khám",
                "bệnh viện",
                "nhà thuốc",
                "thuốc",
                "pharm",
                "y tế",
            ],
        }

        for category, keywords in category_keywords.items():
            if any(kw in name_lower for kw in keywords):
                return category

        return None


class TransactionFactory:
    """
    Factory for creating Transaction entities with domain logic.
    """

    @staticmethod
    def create_expense(
        user_id: UUID,
        wallet_id: UUID,
        *,
        amount: int,
        merchant_name: str | None = None,
        image_url: str | None = None,
        ocr_confidence: float = 0.0,
        note: str | None = None,
    ) -> Transaction:
        """Create a financial expense transaction."""
        return Transaction(
            user_id=user_id,
            wallet_id=wallet_id,
            amount=amount,
            merchant_name=merchant_name,
            image_url=image_url,
            ocr_confidence=ocr_confidence,
            note=note,
            is_life_log=False,
        )

    @staticmethod
    def create_life_log(
        user_id: UUID,
        wallet_id: UUID,
        *,
        image_url: str | None = None,
        tag: str | None = None,
        note: str | None = None,
    ) -> Transaction:
        """Create a life-log entry (no financial data)."""
        return Transaction(
            user_id=user_id,
            wallet_id=wallet_id,
            amount=0,
            merchant_name=tag,
            image_url=image_url,
            ocr_confidence=0.0,
            note=note,
            is_life_log=True,
        )
