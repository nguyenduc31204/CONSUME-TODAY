"""
src.main — Re-export FastAPI app for uvicorn convenience.
Real app lives at infrastructure.adapters.driving.main
"""
from src.infrastructure.adapters.driving.main import app

__all__ = ["app"]
