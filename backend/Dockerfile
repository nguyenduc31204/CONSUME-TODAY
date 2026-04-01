# ─────────────────────────────────────────────────────────────
# MemoirFinance — Backend Dockerfile
# Python 3.12 + FastAPI + uvicorn
# ─────────────────────────────────────────────────────────────

FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Create non-root user
RUN useradd --create-home --shell /bin/bash memoir && \
    chown -R memoir:memoir /app

USER memoir

# Copy dependency file first (for layer caching)
COPY --chown=memoir:memoir requirements.txt .

# Install Python dependencies
RUN python -m venv /app/.venv && \
    . /app/.venv/bin/activate && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=memoir:memoir . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command (can be overridden in docker-compose)
CMD [". /app/.venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
