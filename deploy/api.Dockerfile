# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json api/package.json
RUN npm ci --no-audit --no-fund

COPY api/ api/
RUN npm run build -w @scweb/api

FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=3001

COPY package.json package-lock.json ./
COPY api/package.json api/package.json
RUN npm ci --no-audit --no-fund --omit=dev && npm cache clean --force

COPY --from=builder /app/api/dist ./api/dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
	CMD wget -q --spider http://127.0.0.1:${API_PORT}/health || exit 1

CMD ["node", "api/dist/server.js"]
