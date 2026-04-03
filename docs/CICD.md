# CI/CD Setup Guide — MemoirFinance

> **Nguyên tắc:** Push code lên `main` → tự động test + deploy cả backend (Docker) và frontend (Vercel).

---

## Repository Secrets & Variables

### 1. Backend Secrets (Server SSH)

Vào **GitHub repo** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name | Giá trị | Ghi chú |
|---|---|---|
| `SSH_HOST` | `api.testduc.io.vn` hoặc IP server | Domain/server IP của backend |
| `SSH_USER` | `root` hoặc user SSH của bạn | |
| `SSH_KEY` | Nội dung private key PEM | `cat ~/.ssh/id_rsa` |
| `SSH_PORT` | `22` | Mặc định, bỏ qua nếu dùng port 22 |

**Cách tạo SSH key cho server:**
```bash
# Trên máy local
ssh-keygen -t ed25519 -C "github-actions" -f ./deploy_key
cat ./deploy_key.pub  # paste vào server: ~/.ssh/authorized_keys

# Lấy private key cho GitHub Secret
cat ./deploy_key
```

**Cách lấy `authorized_keys` trên server:**
```bash
# SSH vào server
ssh user@your-server-ip

# Tạo/thêm public key
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAA... github-actions" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 2. Frontend Secrets (Vercel)

Vào **GitHub repo** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name | Cách lấy |
|---|---|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create Token (Full Account) |
| `VERCEL_ORG_ID` | `vercel projects ls --token=<token>` hoặc từ `.vercel/project.json` trong repo đã link Vercel |
| `VERCEL_PROJECT_ID` | Tương tự trên |

**Cách lấy Vercel IDs nhanh:**
```bash
# Cài Vercel CLI
npm i -g vercel

# Link project (chạy trong thư mục frontend đã clone)
cd frontend
vercel link --token=<your-token>

# IDs sẽ có trong .vercel/project.json
cat .vercel/project.json
```

### 3. Actions Variables (không phải Secrets)

Vào **GitHub repo** → **Settings** → **Secrets and variables** → **Actions** → **Variables** → **New repository variable**:

| Variable Name | Giá trị |
|---|---|
| `VITE_API_BASE_URL` | `https://api.testduc.io.vn/api/v1` |
| `BACKEND_SSH_PATH` | `/opt/memoir` (đường dẫn repo trên server) |

---

## Server Setup (1 lần)

### Trên production server, cài đặt:

```bash
# Cài Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# Tạo thư mục app
sudo mkdir -p /opt/memoir
sudo chown $USER:$USER /opt/memoir

# Clone repo (hoặc copy code)
cd /opt/memoir
git init
git remote add origin https://github.com/nguyenduc31204/CONSUME-TODAY.git
git fetch origin main
git reset --hard origin/main

# Tạo .env (lấy từ .env.example)
cp .env.example .env
nano .env  # Điền các giá trị thực

# Tạo Docker network
docker network create memoir 2>/dev/null || true

# Chạy thử lần đầu
docker compose -f docker-compose.prod.yml up -d
```

### Verify Docker deploy working:
```bash
# Kiểm tra backend health
curl http://localhost:8000/health

# Kiểm tra logs
docker logs memoir_backend --tail 20
```

---

## Vercel Project Setup (1 lần)

```bash
# Trong thư mục frontend
cd frontend

# Cài Vercel CLI
npm i -g vercel

# Link với project Vercel hiện có
vercel link --token=<VERCEL_TOKEN>

# Set environment variables trên Vercel Dashboard
# Settings → Environment Variables
# VITE_API_BASE_URL = https://api.testduc.io.vn/api/v1
# (Add for Production, Preview, Development)

# Deploy lần đầu thủ công để ghi nhận project
vercel --prod --token=<VERCEL_TOKEN>
```

---

## Quy trình deploy

```
┌─────────────────────────────────────────────────────────┐
│  git push origin <branch>                                │
└──────────────────────┬──────────────────────────────────┘
                       │ push vào branch khác
                       ▼
            ┌──────────────────────┐
            │  CI only (test)      │
            │  backend-ci ✓        │
            │  frontend-ci ✓       │
            │  (no deploy)         │
            └──────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  git push origin main                                    │
└──────────────────────┬──────────────────────────────────┘
                       │ push vào main
                       ▼
            ┌──────────────────────┐
            │  CI (test)           │
            │  backend-ci → lint   │
            │  frontend-ci → build │
            └──────────┬───────────┘
                       │ CI pass
            ┌──────────┴───────────┐
            │                      │
            ▼                      ▼
    ┌───────────────┐      ┌───────────────┐
    │ deploy-backend│      │deploy-frontend│
    │ Docker → SSH  │      │ Vercel deploy │
    └───────────────┘      └───────────────┘
         ✅ done               ✅ done
```

---

## Kiểm tra CI/CD

### Test CI (không deploy):
```bash
# Tạo branch mới, push — chỉ chạy test
git checkout -b fix-typo
git commit --allow-empty -m "test CI"
git push origin fix-typo
```

### Xem GitHub Actions logs:
```
GitHub repo → Actions tab → click vào run → xem từng job
```

### Nếu deploy thất bại:
```bash
# SSH vào server, kiểm tra logs
ssh user@server
docker logs memoir_backend --tail 50
docker compose -f docker-compose.prod.yml ps

# Rollback về image cũ
docker pull ghcr.io/<user>/memoir-backend:latest
docker compose -f docker-compose.prod.yml up -d backend
```

---

## Cấu trúc Git

```
main          ← production (tự động deploy khi push)
  └── develop ← development (nếu cần)
```

**Quy tắc:**
- Mọi tính năng/bug fix → branch riêng → PR vào `main`
- Merge vào `main` → trigger CI/CD → deploy tự động
- **Không commit trực tiếp vào `main`** (nên dùng PR)

```bash
# Ví dụ workflow
git checkout -b feat/add-download-endpoint
# ... code ...
git add .
git commit -m "feat: add download endpoint for transaction images"
git push origin feat/add-download-endpoint
# → Tạo PR trên GitHub → review → merge
# → CI/CD tự động deploy
```
