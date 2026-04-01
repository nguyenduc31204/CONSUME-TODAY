"""
OCR Domain Service — Pure domain logic for OCR processing.
"""
from typing import Optional
from uuid import UUID

from src.domain.entities.category import DEFAULT_CATEGORIES


# Map AI category keys → display names
CATEGORY_KEY_TO_NAME: dict[str, str] = {
    "f_and_b": "Ăn uống",
    "food_and_drink": "Ăn uống",
    "an_uong": "Ăn uống",
    "shopping": "Mua sắm",
    "mua_sam": "Mua sắm",
    "transport": "Di chuyển",
    "di_chuyen": "Di chuyển",
    "entertainment": "Giải trí",
    "giai_tri": "Giải trí",
    "utilities": "Hóa đơn & Tiện ích",
    "hoa_don_tien_ich": "Hóa đơn & Tiện ích",
    "health": "Sức khỏe",
    "suc_khoe": "Sức khỏe",
    "other": "Khác",
}


class CategoryMapper:
    """
    Pure domain service for mapping AI OCR category keys
    to actual Category entity IDs from the user's wallet.
    """

    @staticmethod
    def map_key_to_display_name(category_key: Optional[str]) -> Optional[str]:
        """Map AI category string key → display name."""
        if not category_key:
            return None
        return CATEGORY_KEY_TO_NAME.get(category_key.lower().strip(), None)

    @staticmethod
    def suggest_category_key(merchant_name: Optional[str]) -> Optional[str]:
        """
        Pure function: suggest category key based on merchant name keywords.
        """
        if not merchant_name:
            return None

        name_lower = merchant_name.lower()

        keywords: list[tuple[str, list[str]]] = [
            ("f_and_b", ["cafe", "coffee", "cà phê", "bánh", "trà", "nhà hàng", "quán", "food", "eat", "starbucks", "the coffee house", "highlands", "phở", "bún", "com", "ga ran", "kfc", "lotteria", "pizza", "burger", " Highlands"]),
            ("shopping", ["mart", "supermarket", "siêu thị", "winmart", "co.opmart", "big c", "lotte", "aeon", "lazada", "shopee", "tiki", "điện máy", "nguyen kim"]),
            ("transport", ["grab", "taxi", "uber", "gojek", "be", "xe máy", "petrol", "xăng", "ga", "tram", "bus", "sân bay", "airport", "parking", "đổ xăng"]),
            ("entertainment", ["cinema", "rạp", "game", "netflix", "spotify", "phim", "youtube", "spotify", "steam", "playstation"]),
            ("utilities", ["điện", "nước", "internet", "fiber", "evn", "viettel", "vnpt", "fpt", "vodafone", "bill", "hóa đơn"]),
            ("health", ["phòng khám", "bệnh viện", "nhà thuốc", "thuốc", "pharm", "y tế", "hospital", "clinic", "pharmacity", "long Chau"]),
        ]

        for key, kws in keywords:
            if any(kw in name_lower for kw in kws):
                return key

        return None
