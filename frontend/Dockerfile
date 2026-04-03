# ─────────────────────────────────────────────────────────────
# MemoirFinance — Frontend Dockerfile
# Node 20 + React + Vite + Tailwind
# Multi-stage: builder → production (nginx)
# ─────────────────────────────────────────────────────────────

# ── Builder stage ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Cache npm install
COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY . .

# Build-time args (override with --build-arg when building)
ARG VITE_API_BASE_URL=https://api.memoir.example.com/api/v1
ARG VITE_APP_ENV=production

# Replace the placeholder in nginx.conf before build so nginx
# uses the correct backend URL at runtime
RUN sed -i "s|https://api.memoir.example.com/api/v1|${VITE_API_BASE_URL}|g" nginx.conf

RUN npm run build

# ── Production stage (nginx) ─────────────────────────────────
FROM nginx:alpine AS production

# Copy pre-configured nginx.conf
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React SPA assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Security headers
RUN sed -i 's|server {|server {\n\
    add_header X-Frame-Options "SAMEORIGIN" always;\
    add_header X-Content-Type-Options "nosniff" always;\
    add_header X-XSS-Protection "1; mode=block" always;\
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;|' /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]

# ── Development stage (hot reload) ───────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
