# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json api/package.json
RUN npm ci --no-audit --no-fund

COPY . .

RUN npm run build && npm run build -w @scweb/api

FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY api/package.json api/package.json
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=builder /app/build ./build
COPY --from=builder /app/api/dist ./api/dist

COPY deploy/start-prod.sh /app/start-prod.sh
RUN chmod +x /app/start-prod.sh

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
	CMD wget -q --spider http://127.0.0.1:3001/health && wget -q --spider http://127.0.0.1:3000/ || exit 1

CMD ["/app/start-prod.sh"]
