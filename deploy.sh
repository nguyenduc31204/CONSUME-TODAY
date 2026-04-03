#!/bin/bash
# ─────────────────────────────────────────────────────────────
# MemoirFinance — Production Deploy Script
# Run on server: bash deploy.sh <COMMIT_SHA> <REGISTRY> <IMAGE_PREFIX>
#
# Prerequisites on server:
#   - Docker & Docker Compose installed
#   - .env file with all required env vars (see .env.example)
#   - Clone of the repo at /opt/memoir/
# ─────────────────────────────────────────────────────────────

set -e

COMMIT_SHA="${1:-latest}"
REGISTRY="${2:-ghcr.io}"
IMAGE_PREFIX="${3}"
APP_DIR="/opt/memoir"

# ── Colours ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERR]${NC}  $*" >&2; }

# ── Check prerequisites ───────────────────────────────────────
if [[ ! -d "$APP_DIR" ]]; then
    log_error "App directory not found: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

if [[ ! -f .env ]]; then
    log_warn ".env file not found in $APP_DIR — copy from .env.example and configure"
fi

# ── Pull new images ───────────────────────────────────────────
log_info "Pulling backend image: ${REGISTRY}/${IMAGE_PREFIX}-backend:${COMMIT_SHA}"
docker pull "${REGISTRY}/${IMAGE_PREFIX}-backend:${COMMIT_SHA}" || {
    log_error "Failed to pull backend image"
    exit 1
}

log_info "Pulling frontend image: ${REGISTRY}/${IMAGE_PREFIX}-frontend:${COMMIT_SHA}"
docker pull "${REGISTRY}/${IMAGE_PREFIX}-frontend:${COMMIT_SHA}" || {
    log_error "Failed to pull frontend image"
    exit 1
}

# ── Tag images locally ───────────────────────────────────────
docker tag "${REGISTRY}/${IMAGE_PREFIX}-backend:${COMMIT_SHA}" \
    "${IMAGE_PREFIX}-backend:latest" 2>/dev/null || \
    docker tag "${REGISTRY}/${IMAGE_PREFIX}-backend:${COMMIT_SHA}" \
    "memoir-backend:latest"

docker tag "${REGISTRY}/${IMAGE_PREFIX}-frontend:${COMMIT_SHA}" \
    "${IMAGE_PREFIX}-frontend:latest" 2>/dev/null || \
    docker tag "${REGISTRY}/${IMAGE_PREFIX}-frontend:${COMMIT_SHA}" \
    "memoir-frontend:latest"

# ── Run migrations ────────────────────────────────────────────
log_info "Running database migrations..."
docker compose run --rm backend \
    sh -c "alembic upgrade head" || log_warn "Migrations failed or skipped (check DB connection)"

# ── Restart services ──────────────────────────────────────────
log_info "Restarting services..."
docker compose down
docker compose up -d

# ── Wait for backend health ───────────────────────────────────
log_info "Waiting for backend to be healthy..."
MAX_WAIT=60
COUNTER=0
while [[ $COUNTER -lt $MAX_WAIT ]]; do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        log_info "Backend is healthy!"
        break
    fi
    sleep 2
    COUNTER=$((COUNTER + 2))
    echo -n "."
done

if [[ $COUNTER -ge $MAX_WAIT ]]; then
    log_error "Backend health check timed out after ${MAX_WAIT}s"
    docker compose logs backend | tail -20
    exit 1
fi

# ── Cleanup old images ───────────────────────────────────────
log_info "Cleaning up old images..."
docker image prune -f > /dev/null 2>&1 || true

# ── Done ─────────────────────────────────────────────────────
COMMIT_SHORT=$(echo "$COMMIT_SHA" | cut -c1-7)
log_info "✅ Deployment complete! Commit: $COMMIT_SHORT"
echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo "  Docs:     http://localhost:8000/docs"
echo ""
