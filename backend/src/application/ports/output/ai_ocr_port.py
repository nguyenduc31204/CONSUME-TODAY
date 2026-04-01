"""
AiOcrPort — Output port for AI OCR processing.
Implemented by Claude API adapter.
"""


class AiOcrPort:
    """Output port for AI OCR (Claude API)."""

    async def analyze_image(self, image_url: str) -> dict:
        """
        Analyze image URL and return structured OCR result.

        Returns:
            {
                "merchant_name": str | None,
                "amount": int,  # VND
                "date": str | None,  # ISO date
                "category": str | None,
                "confidence": float,  # 0.0–1.0
                "is_receipt": bool,
                "items": list[dict] | None,
                "items_amounts": list[int] | None,
                "tag": str | None,  # For life-log photos
            }
        """
        raise NotImplementedError
