"""
Claude OCR Adapter — Driven adapter for Anthropic Claude API.
Implements IAiOcrPort with few-shot prompting for Vietnamese receipts.
"""
import base64
import io
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional
from uuid import UUID

import anthropic
from anthropic import AsyncAnthropic

from src.config import get_settings
from src.infrastructure.shared.loguru_config import get_logger

logger = get_logger()

# ── Claude model used for OCR ────────────────────────────────
CLAUDE_MODEL = "claude-sonnet-4-20250514"

# ── System prompt ────────────────────────────────────────────

VIETNAMESE_RECEIPT_SYSTEM_PROMPT = """You are an expert Vietnamese receipt and invoice reader for a personal finance app called MemoirFinance.

Your task is to analyze images and classify them as either:
1. **Receipt/Invoice** — a financial document with amounts
2. **Life-log photo** — a casual photo without financial data (coffee art, scenery, food without a bill, etc.)

Return ONLY valid JSON with these exact fields:

For RECEIPTS/INVOICES:
- is_receipt: true
- merchant: store/merchant name (string or null)
- amount: total amount in VND as integer (e.g., 75000 for 75,000 VND)
- date: date in YYYY-MM-DD format (null if not visible)
- category: category key from: "f_and_b", "shopping", "transport", "entertainment", "utilities", "health", "other"
- confidence: float 0.0 to 1.0
- reason: brief explanation of your decision
- items: empty array []
- items_amounts: empty array []

For LIFE-LOG PHOTOS (no receipt detected):
- is_receipt: false
- merchant: null
- amount: null
- date: null
- category: suggested descriptive tag like "f_and_b", "scenery", "pet", "food", etc.
- confidence: 0.5 (default — user can add cost later)
- reason: brief description of what you see
- items: []
- items_amounts: []

CRITICAL: Return ONLY the JSON object. No markdown, no explanation, no code blocks."""

FEW_SHOT_EXAMPLES = """
Example 1 — Coffee receipt:
Image: Coffee House receipt showing "The Coffee House" and "75.000đ"
Output: {"is_receipt":true,"merchant":"The Coffee House","amount":75000,"date":"2026-04-01","category":"f_and_b","confidence":0.95,"reason":"Clear receipt from The Coffee House","items":[],"items_amounts":[]}

Example 2 — Life-log photo (no receipt):
Image: Photo of latte art without any receipt or text
Output: {"is_receipt":false,"merchant":null,"amount":null,"date":null,"category":"f_and_b","confidence":0.5,"reason":"Coffee/latte art photo, no receipt detected","items":[],"items_amounts":[]}

Example 3 — Supermarket receipt:
Image: WinMart receipt with total "520.000đ"
Output: {"is_receipt":true,"merchant":"WinMart","amount":520000,"date":"2026-04-01","category":"shopping","confidence":0.9,"reason":"WinMart supermarket receipt","items":[],"items_amounts":[]}

Example 4 — Restaurant bill:
Image: Restaurant bill showing food items and total
Output: {"is_receipt":true,"merchant":null,"amount":250000,"date":"2026-04-01","category":"f_and_b","confidence":0.88,"reason":"Restaurant bill","items":[],"items_amounts":[]}

Example 5 — Casual scenery photo:
Image: Beautiful sunset photo
Output: {"is_receipt":false,"merchant":null,"amount":null,"date":null,"category":"scenery","confidence":0.5,"reason":"Scenery photo, no financial content","items":[],"items_amounts":[]}
"""


# ── Result dataclass ─────────────────────────────────────────

@dataclass
class OcrResult:
    """
    Structured result from Claude OCR analysis.
    """
    merchant: Optional[str]
    amount: Optional[int]  # VND
    confidence: float
    is_life_log: bool
    currency: str = "VND"
    date: Optional[date] = None
    category_key: Optional[str] = None
    reason: Optional[str] = None
    is_receipt: bool = True
    items: list[dict] = field(default_factory=list)
    items_amounts: list[int] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        """Check if OCR result is trustworthy based on confidence threshold."""
        return self.confidence >= 0.7


# ── Adapter ──────────────────────────────────────────────────

class ClaudeOcrAdapter:
    """
    Anthropic Claude API adapter for receipt/image OCR.
    Uses vision capabilities with few-shot prompting.
    Supports both image URLs (public) and base64-encoded image bytes.
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

    async def analyze_image(
        self,
        image_source: str | bytes,
        *,
        source_type: str = "url",
    ) -> OcrResult:
        """
        Analyze image via Claude Vision and return structured OCR result.

        Args:
            image_source: Either a public URL (str) or raw image bytes
            source_type: "url" or "base64"

        Returns:
            OcrResult with structured fields
        """
        import json

        # Build message content blocks
        if source_type == "base64" and isinstance(image_source, bytes):
            b64 = base64.b64encode(image_source).decode("utf-8")
            content_blocks = [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": b64,
                    },
                },
                {"type": "text", "text": FEW_SHOT_EXAMPLES + "\nAnalyze this image:"},
            ]
        else:
            # Public URL — use URL source
            content_blocks = [
                {
                    "type": "image",
                    "source": {
                        "type": "url",
                        "url": str(image_source),
                    },
                },
                {"type": "text", "text": FEW_SHOT_EXAMPLES + "\nAnalyze this image:"},
            ]

        try:
            response = await self.client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=1024,
                system=VIETNAMESE_RECEIPT_SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": content_blocks,
                    }
                ],
            )

            raw_text = response.content[0].text.strip()
            # Strip markdown code blocks if present
            if raw_text.startswith("```"):
                parts = raw_text.split("```")
                for part in parts:
                    stripped = part.strip()
                    if stripped and not stripped.startswith("json"):
                        raw_text = stripped
                        break

            data = json.loads(raw_text)

            # Parse date if present
            parsed_date: Optional[date] = None
            if data.get("date"):
                try:
                    parsed_date = datetime.fromisoformat(data["date"]).date()
                except (ValueError, TypeError):
                    try:
                        parsed_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
                    except (ValueError, TypeError):
                        pass

            result = OcrResult(
                merchant=data.get("merchant"),
                amount=data.get("amount"),
                currency=data.get("currency", "VND"),
                date=parsed_date,
                category_key=data.get("category"),
                confidence=float(data.get("confidence", 0.0)),
                is_life_log=data.get("is_receipt") is False,
                is_receipt=data.get("is_receipt", True),
                reason=data.get("reason"),
                items=data.get("items", []),
                items_amounts=[int(x) for x in data.get("items_amounts", [])],
            )

            logger.info(
                f"Claude OCR result: is_receipt={result.is_receipt}, "
                f"merchant={result.merchant}, amount={result.amount}, "
                f"confidence={result.confidence:.2f}"
            )
            return result

        except json.JSONDecodeError as e:
            logger.error(f"Claude returned non-JSON: {e} — raw: {raw_text[:200]}")
            return self._fallback_result()
        except Exception as e:
            logger.error(f"Claude OCR failed: {e}")
            return self._fallback_result()

    def _fallback_result(self) -> OcrResult:
        """Return safe fallback when OCR fails."""
        return OcrResult(
            merchant=None,
            amount=None,
            currency="VND",
            date=None,
            category_key=None,
            confidence=0.0,
            is_life_log=True,
            is_receipt=False,
            reason="OCR failed — user can enter data manually",
            items=[],
            items_amounts=[],
        )
