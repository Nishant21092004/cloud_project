# ── BloomNest backend image ──────────────────────────────────────────
# Multi-stage: heavy build tools stay in the `builder` stage; the small
# `runtime` stage ships only compiled JS + production dependencies.

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
# `tsc --noEmit` type gate + real build (tests excluded via tsconfig.build)
RUN npm run build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
# non-root user; uploads dir is a mounted volume in production
RUN addgroup -S bloom && adduser -S bloom -G bloom \
    && mkdir -p /app/uploads && chown -R bloom:bloom /app
USER bloom
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --retries=6 --start-period=25s \
  CMD wget -qO- http://127.0.0.1:4000/health/live >/dev/null 2>&1 || exit 1
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
