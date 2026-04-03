"""
Response DTOs — OCR-related Pydantic models for API responses.
"""

from pydantic import BaseModel


class OcrCategoryResult(BaseModel):
    """Category info from OCR with confidence score."""

    id: str | None = None  # Will be UUID string after mapping
    name: str
    confidence: float


class OcrResultResponse(BaseModel):
    """
    Structured OCR result returned to frontend.
    Mirrors the Claude OCR output with validated fields.
    """

    merchant: str | None = None
    amount: int | None = None  # VND, null if life-log
    currency: str = "VND"
    date: str | None = None  # ISO date string
    note: str | None = None
    category: OcrCategoryResult | None = None
    confidence: float
    is_life_log: bool
    reason: str | None = None  # AI reasoning for the classification
