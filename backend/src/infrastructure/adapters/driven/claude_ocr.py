"""
Claude OCR Adapter — Driven adapter for Anthropic Claude API.
Implements AiOcrPort with few-shot prompting for Vietnamese receipts.
"""
import base64
from datetime import datetime

import anthropic
from anthropic import AsyncAnthropic

from src.config import get_settings
from src.infrastructure.shared.loguru_config import get_logger

logger = get_logger()


VIETNAMESE_RECEIPT_SYSTEM_PROMPT = """You are an expert Vietnamese receipt and invoice reader.
Extract structured data from images of receipts and invoices.

Return a JSON object with these fields:
- merchant_name: The store/merchant name (string or null)
- amount: Total amount in VND as integer (0 if no receipt detected)
- date: Date in ISO format YYYY-MM-DD (null if not visible)
- category: Suggested category from: "Ăn uống", "Mua sắm", "Di chuyển", "Giải trí", "Hóa đơn & Tiện ích", "Sức khỏe", or null
- confidence: Float 0.0 to 1.0 indicating extraction confidence
- is_receipt: Boolean — true if this image contains a financial receipt
- tag: For life-log photos (no receipt) — descriptive tag like "Coffee", "Food", "Travel", etc.
- items: Array of {name, amount} for supermarket receipts (empty array for simple receipts)
- items_amounts: Array of integers — individual item amounts for validation

For life-log photos (no receipt):
- Set amount=0, is_receipt=false
- Set tag to a descriptive category like "Coffee", "Food", "Scenery", "Pet", etc.
- Set confidence=0.5

Always return valid JSON only — no markdown, no explanation."""

FEW_SHOT_EXAMPLES = """
Example 1 — Coffee receipt:
Input: Image of Coffee House receipt showing "The Coffee House" and "75.000đ"
Output: {"merchant_name": "The Coffee House", "amount": 75000, "date": "2026-04-01", "category": "Ăn uống", "confidence": 0.95, "is_receipt": true, "tag": null, "items": [], "items_amounts": []}

Example 2 — Life-log photo:
Input: Photo of latte art without any receipt
Output: {"merchant_name": null, "amount": 0, "date": null, "category": null, "confidence": 0.5, "is_receipt": false, "tag": "Coffee", "items": [], "items_amounts": []}

Example 3 — Supermarket:
Input: Image of WinMart receipt with multiple items
Output: {"merchant_name": "WinMart", "amount": 520000, "date": "2026-04-01", "category": "Mua sắm", "confidence": 0.9, "is_receipt": true, "tag": null, "items": [{"name": "Sữa tươi", "amount": 45000}, {"name": "Bánh mì", "amount": 15000}], "items_amounts": [45000, 15000]}
"""


class ClaudeOcrAdapter:
    """
    Anthropic Claude API adapter for receipt/image OCR.
    Uses vision capabilities with few-shot prompting.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: AsyncAnthropic | None = None

    @property
    def client(self) -> AsyncAnthropic:
        """Lazy initialization of Anthropic client."""
        if self._client is None:
            self._client = AsyncAnthropic(
                api_key=self.settings.anthropic_api_key,
                base_url=self.settings.claude_api_url,
            )
        return self._client

    async def analyze_image(self, image_url: str) -> dict:
        """
        Analyze image URL via Claude Vision and return structured OCR result.

        Note: For presigned URLs, we fetch the image bytes and send as base64.
        For direct URLs, we send the URL to Claude.
        """
        try:
            # For R2 presigned URLs or direct public URLs, pass as source
            response = await self.client.messages.create(
                model="claude-haiku-4-5:sonnet",
                max_tokens=1024,
                system=VIETNAMESE_RECEIPT_SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "url",
                                    "url": image_url,
                                },
                            },
                            {
                                "type": "text",
                                "text": FEW_SHOT_EXAMPLES + "\n\nAnalyze this image:",
                            },
                        ],
                    }
                ],
            )

            import json
            raw_text = response.content[0].text.strip()
            # Remove markdown code blocks if present
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
                raw_text = raw_text.strip()

            result = json.loads(raw_text)
            logger.info(f"Claude OCR result: merchant={result.get('merchant_name')}, amount={result.get('amount')}")
            return result

        except Exception as e:
            logger.error(f"Claude OCR failed: {e}")
            # Return safe fallback — user can manually enter data
            return {
                "merchant_name": None,
                "amount": 0,
                "date": datetime.utcnow().isoformat(),
                "category": None,
                "confidence": 0.0,
                "is_receipt": False,
                "tag": "Photo",
                "items": [],
                "items_amounts": [],
            }
