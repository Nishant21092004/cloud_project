# ── build stage: TypeScript → static bundle ─────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
# lockfile-only layer caches npm ci across source edits
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite embeds NO secrets — every API call is a same-origin relative
# path; keys stay in backend env vars, never in this bundle.
RUN npm run build

# ── serve stage: nginx serves dist + reverse-proxies the API ────────
FROM nginx:1.27-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/index.html >/dev/null || exit 1
