"""
OCR Routes — AI-powered receipt and image analysis via Gemini API (free) or Claude API.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile

from src.application.dtos.response.ocr_dto import OcrCategoryResult, OcrResultResponse
from src.config import get_settings
from src.infrastructure.adapters.driven.gemini_ocr import GeminiOcrAdapter
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.shared.exceptions import ForbiddenException

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def _get_user_id(authorization: str = Header(...)) -> UUID:
    if not authorization.startswith("Bearer "):
        raise ForbiddenException(message="Missing Bearer token.")
    token = authorization[7:]
    user_id = JWTService().verify_access_token(token)
    if user_id is None:
        raise ForbiddenException(message="Invalid access token.")
    return user_id


@router.post("/ocr/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    user_id: UUID = Depends(_get_user_id),
):
    """
    Analyze an image via Claude AI OCR — returns structured result WITHOUT saving.
    Use this for preview/draft mode.

    Supports: receipts, invoices, life-log photos.
    Returns: merchant, amount, date, category, confidence, is_life_log.
    """
    # Validate MIME type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {list(ALLOWED_TYPES)}",
        )

    # Read file bytes
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file.")

    # Run OCR via Gemini (free tier, gemini-2.5-flash)
    settings = get_settings()
    if not settings.google_gemini_api_key or settings.google_gemini_api_key.startswith(
        "your_"
    ):
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Set GOOGLE_GEMINI_API_KEY in .env",
        )
    adapter = GeminiOcrAdapter()
    ocr_result = await adapter.analyze_image(
        contents,
        source_type="base64",
    )

    # Map category
    from src.domain.services.ocr_domain_service import CategoryMapper

    category_display = CategoryMapper.map_key_to_display_name(ocr_result.category_key)

    category_info = None
    if category_display:
        category_info = OcrCategoryResult(
            id=None,  # Frontend resolves to UUID after user selects category
            name=category_display,
            confidence=ocr_result.confidence,
        )

    return {
        "success": True,
        "data": OcrResultResponse(
            merchant=ocr_result.merchant,
            amount=ocr_result.amount,
            currency=ocr_result.currency,
            date=ocr_result.date.isoformat() if ocr_result.date else None,
            category=category_info,
            confidence=ocr_result.confidence,
            is_life_log=ocr_result.is_life_log,
            reason=ocr_result.reason,
        ).model_dump(),
        "message": "",
    }
