"""
MemoirFinance — FastAPI Application Entry Point.
Driving adapter: HTTP API, CORS, Exception Handling, Lifespan.
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from src.config import get_settings
from src.infrastructure.adapters.driven.database import engine, Base, AsyncSessionLocal
from src.infrastructure.shared.loguru_config import configure_loguru, get_logger
from src.infrastructure.shared.exceptions import AppException

# Configure logging once at startup
configure_loguru()
logger = get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager: startup → serve → shutdown."""
    logger.info("MemoirFinance API starting up...")
    settings = get_settings()
    logger.info(f"Environment: {settings.app_env}")
    logger.info(f"Database: {settings.db_host}:{settings.db_port}/{settings.db_name}")

    # Startup: create DB tables (Alembic handles production migrations)
    try:
        async with engine.begin() as conn:
            # Only create if tables don't exist (Alembic owns schema in production)
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables checked/created.")
    except Exception as e:
        logger.warning(f"DB table creation skipped (Alembic manages schema): {e}")

    logger.info("MemoirFinance API ready ✨")
    yield

    # Shutdown
    logger.info("MemoirFinance API shutting down...")
    await engine.dispose()
    logger.info("Database connections closed.")


# ── API Response Helpers ────────────────────────────────────

def success_response(data=None, message: str = "", status_code: int = 200) -> JSONResponse:
    """Standard API response envelope: { success, data, message }."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "data": data,
            "message": message,
        },
    )


def error_response(message: str, code: str = "APP_ERROR", details: dict = None, status_code: int = 500) -> JSONResponse:
    """Standard error response."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "data": None,
            "message": message,
            "code": code,
            "details": details or {},
        },
    )


# ── FastAPI App ─────────────────────────────────────────────

settings = get_settings()

app = FastAPI(
    title="MemoirFinance API",
    description="Life Log platform with AI-powered expense tracking",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global Exception Handlers ──────────────────────────────

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle business exceptions."""
    logger.warning(f"AppException: {exc.code} — {exc.message}")
    return error_response(
        message=exc.message,
        code=exc.code,
        details=exc.details,
        status_code=exc.status_code,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle Pydantic validation errors (400/422)."""
    logger.warning(f"Validation error: {exc.errors()}")
    return error_response(
        message="Validation failed",
        code="ERR_VALIDATION",
        details={"errors": exc.errors()},
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unexpected errors."""
    logger.exception(f"Unhandled exception: {exc}")
    return error_response(
        message="An unexpected error occurred.",
        code="ERR_INTERNAL",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


# ── Health Check ───────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for Docker/load balancer."""
    return {"status": "healthy", "service": "memoirfinance-api", "version": "1.0.0"}


# ── Include Routers ────────────────────────────────────────

from src.infrastructure.adapters.driving.routes import transactions, wallets, categories
from src.infrastructure.adapters.driving import auth

api_prefix = "/api/v1"

app.include_router(
    transactions.router,
    prefix=api_prefix,
    tags=["Transactions"],
)

app.include_router(
    wallets.router,
    prefix=api_prefix,
    tags=["Wallets"],
)

app.include_router(
    categories.router,
    prefix=api_prefix,
    tags=["Categories"],
)

app.include_router(
    auth.router,
    prefix=api_prefix,
    tags=["Auth"],
)


# ── Root ───────────────────────────────────────────────────

@app.get("/", tags=["Root"])
async def root():
    """API root."""
    return {
        "name": "MemoirFinance API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
