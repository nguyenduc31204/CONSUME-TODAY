"""
Loguru Configuration — Centralized logging setup.
All modules import from loguru and call logger.
NO print() statements allowed.
"""
import sys
from pathlib import Path
from loguru import logger


def configure_loguru() -> None:
    """
    Configure loguru with consistent formatting across all environments.
    Call once at application startup (in main.py lifespan).
    """
    # Remove default handler
    logger.remove()

    # Console handler — always visible in dev
    logger.add(
        sys.stderr,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> — <level>{message}</level>",
        colorize=True,
        level="INFO",
        backtrace=True,
        diagnose=True,
    )

    # File handler — logs/app.log (rotated)
    log_path = Path("logs/app.log")
    log_path.parent.mkdir(parents=True, exist_ok=True)

    logger.add(
        log_path,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function} — {message}",
        rotation="10 MB",
        retention="7 days",
        compression="zip",
        level="DEBUG",
        backtrace=True,
        diagnose=True,
    )

    # Access log handler (HTTP requests)
    logger.add(
        Path("logs/access.log"),
        format="{time:YYYY-MM-DD HH:mm:ss} | {message}",
        rotation="10 MB",
        retention="7 days",
        level="INFO",
    )


def get_logger():
    """Get the configured logger instance."""
    return logger
