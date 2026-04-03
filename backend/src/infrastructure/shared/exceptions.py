"""
Business Exceptions — Domain-aware exceptions used throughout the application.
These are caught by the global exception handler in FastAPI.
"""


class AppException(Exception):
    """Base application exception. All business exceptions inherit from this."""

    code: str = "APP_ERROR"
    status_code: int = 500
    message: str = "An unexpected error occurred."

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        details: dict | None = None,
    ) -> None:
        self.message = message or self.message
        self.code = code or self.code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "message": self.message,
            "details": self.details,
        }


# ── 4xx Client Errors ──────────────────────────────────────


class NotFoundException(AppException):
    """Resource not found (404)."""

    code = "ERR_NOT_FOUND"
    status_code = 404
    message = "Resource not found."


class UnauthorizedException(AppException):
    """Authentication required or failed (401)."""

    code = "ERR_UNAUTHORIZED"
    status_code = 401
    message = "Authentication required."


class ForbiddenException(AppException):
    """User lacks permission (403)."""

    code = "ERR_FORBIDDEN"
    status_code = 403
    message = "Permission denied."


class ValidationException(AppException):
    """Request validation failed (422)."""

    code = "ERR_VALIDATION"
    status_code = 422
    message = "Validation error."


class ConflictException(AppException):
    """Resource conflict, e.g. duplicate entry (409)."""

    code = "ERR_CONFLICT"
    status_code = 409
    message = "Resource already exists."


# ── 5xx Server Errors ──────────────────────────────────────


class StorageUnavailableException(AppException):
    """Image storage service unavailable (503)."""

    code = "ERR_STORAGE_UNAVAILABLE"
    status_code = 503
    message = "Image storage service is temporarily unavailable."


class AiServiceException(AppException):
    """AI OCR service error (502)."""

    code = "ERR_AI_SERVICE"
    status_code = 502
    message = "AI service is temporarily unavailable."


class DatabaseException(AppException):
    """Database connection or query error (500)."""

    code = "ERR_DATABASE"
    status_code = 500
    message = "Database error occurred."
