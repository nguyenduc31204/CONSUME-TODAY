"""
CaptureExpenseUseCase — Core use case for capturing a photo and extracting expense data.
Orchestrates: image upload → AI OCR → transaction creation → persistence.
"""

from datetime import datetime
from typing import Protocol
from uuid import UUID

from src.domain.entities.transaction import Transaction
from src.domain.services.domain_service import OcrValidationService
from src.infrastructure.shared.loguru_config import get_logger


class IStoragePort(Protocol):
    """Output port for image storage."""

    async def upload_image(
        self,
        user_id: str,
        file_bytes: bytes,
        filename: str,
        mime_type: str = "image/jpeg",
    ) -> dict:
        """
        Upload image and return result dict with:
        url, thumbnail_url, width, height, file_size, storage_key.
        """
        ...


class IAiOcrPort(Protocol):
    """Output port for AI OCR processing."""

    async def analyze_image(
        self,
        image_source: str | bytes,
        *,
        source_type: str = "url",
    ):
        """
        Analyze image and return OcrResult with:
        merchant, amount, currency, date, category_key, confidence,
        is_life_log, is_receipt, reason.
        """
        ...


class ITransactionRepositoryPort(Protocol):
    """Output port for transaction persistence."""

    async def save(self, transaction: Transaction) -> Transaction: ...

    async def get_by_id(self, transaction_id: UUID) -> Transaction | None: ...

    async def update(self, transaction: Transaction) -> Transaction: ...


class CaptureExpenseUseCase:
    """
    Use case: User captures a photo → upload → AI OCR → Transaction saved.
    """

    def __init__(
        self,
        storage_port: IStoragePort,
        ai_ocr_port: IAiOcrPort,
        transaction_repo: ITransactionRepositoryPort,
    ) -> None:
        self._storage = storage_port
        self._ai = ai_ocr_port
        self._repo = transaction_repo

    async def execute(
        self,
        user_id: UUID,
        wallet_id: UUID,
        file_bytes: bytes,
        filename: str,
    ) -> tuple[Transaction, dict]:
        """
        Execute the capture expense flow.

        1. Upload image to storage (R2)
        2. Send preprocessed image bytes to AI OCR
        3. Validate OCR result
        4. Create and persist Transaction
        5. Return transaction + OCR result

        Returns: (Transaction entity, OCR result dict)
        """
        # Step 1: Upload image
        upload_result = await self._storage.upload_image(
            user_id=str(user_id),
            file_bytes=file_bytes,
            filename=filename,
        )
        image_url = upload_result["url"]
        thumbnail_url = upload_result.get("thumbnail_url")

        # Step 2: AI OCR analysis — send preprocessed bytes for best accuracy
        # The storage already compressed/processed the image; send those bytes
        ocr_result = await self._ai.analyze_image(
            file_bytes,  # original bytes (Claude handles internally)
            source_type="base64",
        )

        # Step 3: Build transaction based on OCR result
        if ocr_result.is_life_log or ocr_result.amount is None:
            # Life-log photo
            transaction = Transaction(
                user_id=user_id,
                wallet_id=wallet_id,
                image_url=image_url,
                thumbnail_url=thumbnail_url,
                merchant_name=ocr_result.reason,  # Store AI tag as merchant/description
                amount=0,
                currency="VND",
                ocr_confidence=ocr_result.confidence,
                is_life_log=True,
            )
        else:
            # Financial expense
            # Validate if items are provided
            if ocr_result.items_amounts:
                is_valid = OcrValidationService.validate_amount_consistency(
                    ocr_result.amount, ocr_result.items_amounts
                )
                if not is_valid:
                    # Log warning but still save — user can correct
                    logger.warning(
                        f"OCR amount mismatch: total={ocr_result.amount}, "
                        f"items_sum={sum(ocr_result.items_amounts)}"
                    )

            transaction = Transaction(
                user_id=user_id,
                wallet_id=wallet_id,
                image_url=image_url,
                thumbnail_url=thumbnail_url,
                merchant_name=ocr_result.merchant,
                amount=ocr_result.amount,
                currency=ocr_result.currency,
                transaction_date=datetime.combine(ocr_result.date, datetime.min.time())
                if ocr_result.date
                else None,
                ocr_confidence=ocr_result.confidence,
                is_life_log=False,
            )

        # Step 4: Persist
        saved = await self._repo.save(transaction)

        # Step 5: Build OCR result dict for response
        ocr_dict = {
            "merchant": ocr_result.merchant,
            "amount": ocr_result.amount,
            "currency": ocr_result.currency,
            "date": ocr_result.date.isoformat() if ocr_result.date else None,
            "category_key": ocr_result.category_key,
            "confidence": ocr_result.confidence,
            "is_life_log": ocr_result.is_life_log,
            "is_receipt": ocr_result.is_receipt,
            "reason": ocr_result.reason,
            "is_valid": ocr_result.is_valid,
        }

        return saved, ocr_dict


logger = get_logger()
