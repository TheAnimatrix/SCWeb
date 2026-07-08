# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json api/package.json
RUN npm ci --no-audit --no-fund

COPY . .

# PUBLIC_* are baked into the client bundle at build time — set via Dokploy build args.
ARG PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG PUBLIC_SUPABASE_KEY=placeholder-anon-key
ARG PUBLIC_RAZORPAY_ID=placeholder-razorpay-id
ARG PUBLIC_IS_PRODUCTION=true
ARG PUBLIC_SITE_URL=
ARG PUBLIC_VERCEL_URL=
ARG PUBLIC_SENTRY_DSN=

ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL \
	PUBLIC_SUPABASE_KEY=$PUBLIC_SUPABASE_KEY \
	PUBLIC_RAZORPAY_ID=$PUBLIC_RAZORPAY_ID \
	PUBLIC_IS_PRODUCTION=$PUBLIC_IS_PRODUCTION \
	PUBLIC_SITE_URL=$PUBLIC_SITE_URL \
	PUBLIC_VERCEL_URL=$PUBLIC_VERCEL_URL \
	PUBLIC_SENTRY_DSN=$PUBLIC_SENTRY_DSN

RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
COPY api/package.json api/package.json
RUN npm ci --no-audit --no-fund --omit=dev && npm cache clean --force

COPY --from=builder /app/build ./build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
	CMD wget -q --spider http://127.0.0.1:${PORT}/ || exit 1

CMD ["node", "build/index.js"]
