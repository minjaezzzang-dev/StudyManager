# =============================================================
# EasyKR Web — Next.js Standalone Dockerfile
# =============================================================
# 빌드: docker build -t easykr-web .
# 실행: docker run -p 3000:3000 easykr-web
# =============================================================

# ──────────────────────────────────────────────
# Base: Node.js 20 Alpine (경량)
# ──────────────────────────────────────────────
FROM node:20-alpine AS base

# ──────────────────────────────────────────────
# Install dependencies
# ──────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# 패키지 매니저 캐시용
COPY package.json package-lock.json* ./
RUN npm ci

# ──────────────────────────────────────────────
# Build application
# ──────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 환경 변수 주입 (빌드 시)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ──────────────────────────────────────────────
# Production runner (standalone)
# ──────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root 사용자 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Standalone 출력물 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
