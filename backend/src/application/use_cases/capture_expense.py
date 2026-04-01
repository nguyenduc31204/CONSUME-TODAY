"""
CaptureExpenseUseCase — Core use case for capturing a photo and extracting expense data.
Orchestrates: image upload → AI OCR → transaction creation → persistence.
"""
from typing import Protocol
from uuid import UUID

from src.domain.entities.transaction import Transaction
from src.domain.services.domain_service import OcrValidationService, TransactionFactory


class StoragePort(Protocol):
    """Output port for image storage."""

    async def upload_image(self, file_bytes: bytes, filename: str) -> str:
        """Upload image and return public URL."""
        ...


class AiOcrPort(Protocol):
    """Output port for AI OCR processing."""

    async def analyze_image(self, image_url: str) -> dict:
        """
        Analyze image and return OCR result.
        Expected keys: merchant_name, amount, date, category, confidence
        """
        ...


class TransactionRepositoryPort(Protocol):
    """Output port for transaction persistence."""

    async def save(self, transaction: Transaction) -> Transaction:
        ...

    async def get_by_id(self, transaction_id: UUID) -> Transaction | None:
        ...

    async def update(self, transaction: Transaction) -> Transaction:
        ...


class CaptureExpenseUseCase:
    """
    Use case: User captures a photo → AI extracts data → Transaction saved.
    """

    def __init__(
        self,
        storage_port: StoragePort,
        ai_ocr_port: AiOcrPort,
        transaction_repo: TransactionRepositoryPort,
    ) -> None:
        self._storage = storage_port
        self._ai = ai_ocr_port
        self._repo = transaction_repo
        self._validator = OcrValidationService()
        self._factory = TransactionFactory()

    async def execute(
        self,
        user_id: UUID,
        wallet_id: UUID,
        file_bytes: bytes,
        filename: str,
    ) -> Transaction:
        """
        Execute the capture expense flow.

        1. Upload image to storage
        2. Send to AI OCR
        3. Validate OCR result
        4. Create and persist Transaction
        5. Return result
        """
        # Step 1: Upload image
        image_url = await self._storage.upload_image(file_bytes, filename)

        # Step 2: AI OCR analysis
        ocr_result = await self._ai.analyze_image(image_url)

        # Step 3: Determine if life-log or expense
        amount = ocr_result.get("amount", 0)
        merchant_name = ocr_result.get("merchant_name")
        confidence = ocr_result.get("confidence", 0.0)

        if amount == 0:
            # Life-log photo (no receipt)
            transaction = TransactionFactory.create_life_log(
                user_id=user_id,
                wallet_id=wallet_id,
                image_url=image_url,
                tag=ocr_result.get("tag"),
            )
        else:
            # Financial expense
            # Step 4: Validate if items are provided
            items_amounts = ocr_result.get("items_amounts", [])
            if items_amounts:
                is_valid = OcrValidationService.validate_amount_consistency(
                    amount, items_amounts
                )
                if not is_valid:
                    # Log warning but still save — user can correct
                    pass

            transaction = TransactionFactory.create_expense(
                user_id=user_id,
                wallet_id=wallet_id,
                amount=amount,
                merchant_name=merchant_name,
                image_url=image_url,
                ocr_confidence=confidence,
            )

        # Step 5: Persist
        return await self._repo.save(transaction)

    async def update_transaction(
        self,
        transaction_id: UUID,
        *,
        amount: int | None = None,
        category_id: UUID | None = None,
        wallet_id: UUID | None = None,
        note: str | None = None,
    ) -> Transaction:
        """Update a transaction (user correction via human-in-the-loop)."""
        transaction = await self._repo.get_by_id(transaction_id)
        if not transaction:
            raise ValueError("Transaction not found")

        if amount is not None:
            transaction.update_amount(amount)
        if category_id is not None:
            transaction.update_category(category_id)
        if wallet_id is not None:
            transaction.update_wallet(wallet_id)
        if note is not None:
            transaction.note = note
            transaction.touch()

        return await self._repo.update(transaction)
