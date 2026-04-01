"""
Response DTOs — OCR-related Pydantic models for API responses.
"""
from datetime import date
from typing import Optional

from pydantic import BaseModel


class OcrCategoryResult(BaseModel):
    """Category info from OCR with confidence score."""

    id: Optional[str] = None  # Will be UUID string after mapping
    name: str
    confidence: float


class OcrResultResponse(BaseModel):
    """
    Structured OCR result returned to frontend.
    Mirrors the Claude OCR output with validated fields.
    """

    merchant: Optional[str] = None
    amount: Optional[int] = None  # VND, null if life-log
    currency: str = "VND"
    date: Optional[str] = None  # ISO date string
    category: Optional[OcrCategoryResult] = None
    confidence: float
    is_life_log: bool
    reason: Optional[str] = None  # AI reasoning for the classification
