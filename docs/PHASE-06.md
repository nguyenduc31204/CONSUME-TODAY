# Phase 6: CI/CD + Deploy

**Mục tiêu:** Production infrastructure hoàn chỉnh, CI/CD pipeline tự động, monitoring, và launch.

**Phụ thuộc:** Phase 5 (toàn bộ ứng dụng hoàn chỉnh)

---

## 6.1 — Production Infrastructure

### Mục tiêu

Thiết lập production Docker configuration, environment variables, và infrastructure setup.

### Production Docker Compose

```yaml
# docker-compose.prod.yml
services:
  postgres:
    image: postgres:16-alpine
    restart: always
    volumes:
      - postgres_prod:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: memoirfinance
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d memoirfinance"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - memoir_net

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/memoirfinance
      APP_ENV: production
      APP_SECRET_KEY: ${APP_SECRET_KEY}
      CORS_ORIGINS: ${CORS_ORIGINS}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      JWT_PRIVATE_KEY: ${JWT_PRIVATE_KEY}
      JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
      ACCESS_TOKEN_EXPIRE_MINUTES: 15
      REFRESH_TOKEN_EXPIRE_DAYS: 7
      R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
      R2_BUCKET_NAME: ${R2_BUCKET_NAME}
      R2_PUBLIC_URL: ${R2_PUBLIC_URL}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    networks:
      - memoir_net

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: ${VITE_API_BASE_URL}
        VITE_GOOGLE_CLIENT_ID: ${VITE_GOOGLE_CLIENT_ID}
        VITE_R2_PUBLIC_URL: ${VITE_R2_PUBLIC_URL}
    restart: always
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - memoir_net

volumes:
  postgres_prod:

networks:
  memoir_net:
    driver: bridge
```

### Production Environment Variables

```env
# .env.production

# Database
POSTGRES_USER=prod_memoir
POSTGRES_PASSWORD=<strong_random_password_32chars>

# App
APP_ENV=production
APP_SECRET_KEY=<64_char_random_string>
CORS_ORIGINS=https://memoirfinance.com,https://www.memoirfinance.com

# Auth
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
JWT_PRIVATE_KEY=<RS256_private_key_PEM_multiline>
JWT_PUBLIC_KEY=<RS256_public_key_PEM_multiline>
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Cloudflare R2
R2_ACCOUNT_ID=<cloudflare_account_id>
R2_ACCESS_KEY_ID=<r2_access_key>
R2_SECRET_ACCESS_KEY=<r2_secret_key>
R2_BUCKET_NAME=memoirfinance-prod
R2_PUBLIC_URL=https://pub.xxx.r2.dev

# AI
ANTHROPIC_API_KEY=<anthropic_api_key>

# Frontend
VITE_API_BASE_URL=https://api.memoirfinance.com/api/v1
VITE_GOOGLE_CLIENT_ID=<same_as_google_client_id>
VITE_R2_PUBLIC_URL=https://pub.xxx.r2.dev
```

### Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash appuser

COPY --from=builder /install /usr/local
COPY --chown=appuser:appuser . .

USER appuser
ENV PYTHONPATH=/app
EXPOSE 8000

CMD ["uvicorn", "src.infrastructure.adapters.driving.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_R2_PUBLIC_URL
RUN VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_R2_PUBLIC_URL=$VITE_R2_PUBLIC_URL \
    npm run build

# ---- Production stage ----
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 6.2 — CI/CD Pipeline

### Mục tiêu

GitHub Actions pipeline tự động: lint → test → build → deploy lên production.

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "22"
  PYTHON_VERSION: "3.12"

jobs:
  # ─── Lint + Type-check ───────────────────────────────────────────
  backend-lint:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Cache pip
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: pip-py312-${{ hashFiles('backend/requirements.txt') }}

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Lint with ruff
        run: ruff check src/

      - name: Type-check with mypy
        run: mypy src/

  frontend-lint:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: frontend/node_modules
          key: npm-py312-${{ hashFiles('frontend/package-lock.json') }}

      - name: Install dependencies
        run: npm ci

      - name: ESLint
        run: npm run lint

      - name: Type-check
        run: npm run type-check

  # ─── Tests ───────────────────────────────────────────────────────
  backend-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Cache pip
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: pip-py312-${{ hashFiles('backend/requirements.txt') }}

      - name: Install dependencies
        run: pip install -r requirements.txt pytest pytest-asyncio pytest-cov httpx

      - name: Run unit tests
        run: pytest tests/unit/ -v --cov=src --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./backend/coverage.xml
          fail_ci_if_error: false

  frontend-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: frontend/node_modules
          key: npm-py312-${{ hashFiles('frontend/package-lock.json') }}

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests (Vitest)
        run: npm run test -- --coverage --run

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./frontend/coverage/index.xml
          fail_ci_if_error: false

  # ─── Build Docker images ─────────────────────────────────────────
  build-backend:
    needs: [backend-lint, backend-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/memoir-backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  build-frontend:
    needs: [frontend-lint, frontend-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/memoir-frontend:${{ github.sha }}
          args: |
            VITE_API_BASE_URL=${{ secrets.VITE_API_BASE_URL }}
            VITE_GOOGLE_CLIENT_ID=${{ secrets.VITE_GOOGLE_CLIENT_ID }}
            VITE_R2_PUBLIC_URL=${{ secrets.VITE_R2_PUBLIC_URL }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ─── Deploy to production ────────────────────────────────────────
  deploy:
    needs: [build-backend, build-frontend]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/memoirfinance
            git pull origin main
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --no-deps
            docker image prune -f

      - name: Run database migrations
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

      - name: Health check
        run: |
          sleep 10
          curl -f https://api.memoirfinance.com/health || exit 1
```

### Deployment Environment Setup (Production Server)

```bash
# Trên production server (/opt/memoirfinance/)

# 1. Clone repo (hoặc git pull)
git clone https://github.com/<org>/memoirfinance.git /opt/memoirfinance
cd /opt/memoirfinance

# 2. Tạo .env.production
cp .env.example .env.production
# → Điền tất cả secrets

# 3. Cấu phận Docker network
docker network create memoir_net || true

# 4. Pull pre-built images hoặc build local
docker compose -f docker-compose.prod.yml pull

# 5. Khởi chạy
docker compose -f docker-compose.prod.yml up -d

# 6. Chạy migrations
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 7. Kiểm tra health
curl http://localhost:8000/health
```

---

## 6.3 — Monitoring + Observability

### Mục tiêu

Thiết lập logging, monitoring, và alerting cho production.

### Loguru Configuration (Backend)

```python
# src/infrastructure/shared/loguru_config.py
import sys
from loguru import logger
from pathlib import Path

LOG_DIR = Path("/var/log/memoirfinance")
LOG_DIR.mkdir(parents=True, exist_ok=True)

logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> — <level>{message}</level>",
    level="INFO",
    colorize=True,
)
logger.add(
    LOG_DIR / "memoirfinance.log",
    rotation="100 MB",
    retention="14 days",
    compression="gz",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function} — {message}",
    level="DEBUG",
)
```

### Health Check Endpoint

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/health` | None | Health check (DB, R2, Claude API status) |

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "checks": {
    "database": "ok",
    "storage": "ok",
    "ai": "ok"
  }
}
```

### Structured Logging

Tất cả log entries phải có:
```
timestamp | level | service | user_id | request_id | action | duration_ms | message
```

### Error Tracking (Sentry)

```python
# src/infrastructure/shared/sentry.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastAPIIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[
        FastAPIIntegration(),
        SqlalchemyIntegration(),
    ],
    environment=os.getenv("APP_ENV"),
    traces_sample_rate=0.1,
)
```

---

## 6.4 — Domain + SSL + CDN Setup

### Mục tiêu

Cấu hình domain, SSL certificates, và CDN cho production.

### Nginx Configuration (Frontend Proxy)

```nginx
# frontend/nginx.conf
upstream backend {
    server backend:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name memoirfinance.com www.memoirfinance.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name memoirfinance.com www.memoirfinance.com;

    # SSL
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### SSL Certificate (Let's Encrypt / Cloudflare)

**Option A — Cloudflare (recommended):**
- Cloudflare SSL/TLS mode: "Full" hoặc "Strict"
- Sử dụng Cloudflare Origin Certificate → install trên server
- Auto-renew qua Cloudflare

**Option B — Let's Encrypt:**
```bash
# Certbot
sudo certbot --nginx -d memoirfinance.com -d www.memoirfinance.com
# Auto-renewal: /etc/cron.d/certbot
```

### Cloudflare R2 + CDN

```
Static assets (images) → Cloudflare R2
  ↓ (custom domain)
cdn.memoirfinance.com → R2 bucket
  ↓ (via Cloudflare)
Global CDN edge servers
```

---

## 6.5 — Launch Checklist

### Pre-launch Verification

- [ ] Database migrations đã chạy và verified
- [ ] All environment variables đã set đúng production values
- [ ] SSL certificates valid và renewed
- [ ] DNS records trỏ đúng (A record → server IP, CNAME → CDN)
- [ ] Health check endpoint trả về 200
- [ ] OAuth redirect URIs đã cập nhật production URL
- [ ] R2 bucket CORS policy cho phép production domain
- [ ] Backup strategy: PostgreSQL auto-backup (daily, retention 30 days)
- [ ] Rate limiting enabled on API endpoints
- [ ] GitHub Actions secrets đã set đầy đủ

### Launch Sequence

```
1. [ ] Merge tất cả pending PRs → main branch
2. [ ] Trigger CI/CD pipeline (git push main)
3. [ ] Monitor GitHub Actions → tất cả jobs pass
4. [ ] Monitor production logs → không có ERROR
5. [ ] Test end-to-end flow trên production:
     - [ ] Google OAuth login
     - [ ] Upload ảnh + OCR
     - [ ] Auto-save
     - [ ] Feed hiển thị transaction
     - [ ] Reports charts
     - [ ] Logout
6. [ ] Verify SSL grade: A+ trên ssllabs.com
7. [ ] Verify Lighthouse score: Performance > 90, Accessibility > 95
8. [ ] Thông báo launch (internal / users)
```

---

## Summary

### Phase 6 Deliverables

| Sub-phase | Scope |
|---|---|
| 6.1 | Production Docker Compose, Dockerfiles (multi-stage), production env template |
| 6.2 | GitHub Actions CI/CD pipeline: lint → test → build → deploy |
| 6.3 | Monitoring: structured logging, health check, Sentry error tracking |
| 6.4 | Nginx + SSL + CDN configuration, domain setup |
| 6.5 | Pre-launch checklist, launch sequence |

### Success Criteria

- [ ] `docker-compose.prod.yml` chạy đúng 3 services (postgres, backend, frontend)
- [ ] Backend multi-stage Dockerfile < 200MB
- [ ] Frontend multi-stage Dockerfile < 50MB
- [ ] CI pipeline: backend lint + type-check + test pass
- [ ] CI pipeline: frontend lint + type-check + test pass
- [ ] CD: auto-deploy on main push
- [ ] Health check endpoint trả về DB + R2 + AI status
- [ ] Structured logging đúng format
- [ ] Sentry SDK integrated cho backend
- [ ] Nginx config với SSL, security headers, gzip, SPA fallback
- [ ] SSL certificate valid (Cloudflare Origin hoặc Let's Encrypt)
- [ ] Production logs không có ERROR
- [ ] Pre-launch checklist hoàn tất

### Phase tiếp theo

**MemoirFinance v1.0 — Launched!**

Sau khi hoàn thành Phase 6, ứng dụng hoàn chỉnh sẵn sàng phát hành. Các tính năng tiếp theo (Shared Wallets, Visual Mosaic, Mobile App, Push Notifications) sẽ được lên kế hoạch riêng trong `.planning/POST-LAUNCH.md`.
