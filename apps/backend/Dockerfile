# =============================================================
# EasyKR Backend — Express Dockerfile
# =============================================================
# 빌드: docker build -t easykr-backend .
# 실행: docker run -p 10000:10000 easykr-backend
# =============================================================

FROM node:20-alpine AS base

# 의존성 설치
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --production

# 프로덕션 실행
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root 사용자
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# 의존성 및 소스 복사
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 10000

ENV PORT=10000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "src/server.js"]
