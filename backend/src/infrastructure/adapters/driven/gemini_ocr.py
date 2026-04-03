"""
Gemini OCR Adapter — Driven adapter for Google Gemini API.
Implements IAiOcrPort with few-shot prompting for Vietnamese receipts.
Free alternative to Claude for expense tracking.

Install: pip install google-generativeai
"""

import json
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional

import google.generativeai as genai

from src.config import get_settings
from src.infrastructure.shared.loguru_config import get_logger

logger = get_logger()

# ── Model ──────────────────────────────────────────────────────
GEMINI_MODEL = "gemini-2.5-flash"  # Free tier, fast, supports vision

SYSTEM_PROMPT = """Bạn là chuyên gia đọc hóa đơn và biên lai tiếng Việt cho ứng dụng tài chính cá nhân MemoirFinance.

Nhiệm vụ: Phân tích ảnh và phân loại thành:
1. **Hóa đơn (Receipt)** — tài liệu tài chính có số tiền
2. **Ảnh thường (Life-log)** — ảnh không có dữ liệu tài chính (cà phê, phong cảnh, đồ ăn không có hóa đơn...)

Chỉ trả về JSON thuần, không có markdown, không giải thích:

VỚI HÓA ĐƠN (is_receipt = true):
{
  "is_receipt": true,
  "merchant": "tên cửa hàng",
  "amount": số tiền VND dạng số nguyên (ví dụ: 75000),
  "date": "YYYY-MM-DD",
  "category": "f_and_b" | "shopping" | "transport" | "entertainment" | "utilities" | "health" | "other",
  "confidence": 0.0 - 1.0,
  "reason": "mô tả ngắn",
  "items": [],
  "items_amounts": [],
  "is_life_log": false
}

VỚI ẢNH THƯỜNG (is_receipt = false):
{
  "is_receipt": false,
  "merchant": null,
  "amount": null,
  "date": null,
  "category": "f_and_b" | "scenery" | "food" | "pet" | "other",
  "confidence": 0.5,
  "reason": "kể tên ngắn về đối tượng trong ảnh (ví dụ: cà phê sữa đá, bãi biển, món ăn, chó cưng...)",
  "items": [],
  "items_amounts": [],
  "is_life_log": true
}"""


@dataclass
class OcrResult:
    """Structured result from Gemini OCR analysis — same interface as ClaudeOcrAdapter."""

    merchant: Optional[str]
    amount: int | None  # VND
    confidence: float
    is_life_log: bool
    currency: str = "VND"
    date: Optional[date] = None
    note: Optional[str] = None
    category_key: Optional[str] = None
    reason: Optional[str] = None
    is_receipt: bool = True
    items: list = field(default_factory=list)
    items_amounts: list = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return self.confidence >= 0.7


class GeminiOcrAdapter:
    """
    Google Gemini API adapter for receipt/image OCR.
    Free tier (15 req/min, 1500 img/day with gemini-2.0-flash).
    Supports base64-encoded image bytes via Vision API.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        genai.configure(api_key=self.settings.google_gemini_api_key)
        self._model: genai.GenerativeModel | None = None

    @property
    def model(self) -> genai.GenerativeModel:
        """Lazy initialization of Gemini GenerativeModel."""
        if self._model is None:
            self._model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                system_instruction=SYSTEM_PROMPT,
            )
        return self._model

    async def analyze_image(
        self,
        image_source: str | bytes,
        *,
        source_type: str = "url",
    ) -> OcrResult:
        """
        Analyze image via Gemini Vision and return structured OCR result.

        Args:
            image_source: Either a public URL (str) or raw image bytes
            source_type: "url" or "base64"

        Returns:
            OcrResult with structured fields
        """
        try:
            # Build PIL Image from source
            if isinstance(image_source, bytes):
                from io import BytesIO

                from PIL import Image

                image = Image.open(BytesIO(image_source))
            else:
                import httpx

                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(str(image_source))
                    response.raise_for_status()
                from io import BytesIO

                from PIL import Image

                image = Image.open(BytesIO(response.content)).convert("RGB")

            generation_config = genai.types.GenerationConfig(
                response_mime_type="application/json",
            )

            response = await self.model.generate_content_async(
                contents=[image],
                generation_config=generation_config,
            )

            raw_text = response.text.strip()

            # Gemini may wrap in markdown code blocks
            if raw_text.startswith("```"):
                for chunk in raw_text.split("```"):
                    stripped = chunk.strip()
                    if stripped and not stripped.startswith(("json", "python")):
                        raw_text = stripped
                        break

            data = json.loads(raw_text)

            # Parse date
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
                note=data.get("note"),
                category_key=data.get("category"),
                confidence=float(data.get("confidence", 0.0)),
                is_life_log=data.get("is_life_log", data.get("is_receipt") is False),
                is_receipt=data.get("is_receipt", True),
                reason=data.get("reason"),
                items=data.get("items", []),
                items_amounts=[int(x) for x in data.get("items_amounts", [])],
            )

            logger.info(
                f"Gemini OCR result: is_receipt={result.is_receipt}, "
                f"merchant={result.merchant}, amount={result.amount}, "
                f"confidence={result.confidence:.2f}"
            )
            return result

        except json.JSONDecodeError as e:
            logger.error(f"Gemini returned non-JSON: {e}")
            return self._fallback_result()
        except Exception as e:
            logger.error(f"Gemini OCR failed: {e}")
            return self._fallback_result()

    def _fallback_result(self) -> OcrResult:
        """Return safe fallback when OCR fails."""
        return OcrResult(
            merchant=None,
            amount=None,
            currency="VND",
            date=None,
            note=None,
            category_key=None,
            confidence=0.0,
            is_life_log=True,
            is_receipt=False,
            reason="OCR failed — user can enter data manually",
            items=[],
            items_amounts=[],
        )
