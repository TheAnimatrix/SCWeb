# Dokploy Docker images

Build from the repository root.

## Web (SvelteKit)

```bash
docker build -f deploy/web.Dockerfile .
```

### Build args (required for a real deploy)

| Arg                    | Purpose                              |
| ---------------------- | ------------------------------------ |
| `PUBLIC_SUPABASE_URL`  | Supabase project URL                 |
| `PUBLIC_SUPABASE_KEY`  | Supabase anon key                    |
| `PUBLIC_RAZORPAY_ID`   | Razorpay key id                      |
| `PUBLIC_IS_PRODUCTION` | `true` in production                 |
| `PUBLIC_SITE_URL`      | Canonical site URL (OAuth redirects) |
| `PUBLIC_VERCEL_URL`    | Optional hosting URL fallback        |
| `PUBLIC_SENTRY_DSN`    | Optional browser error monitoring    |

### Runtime env

| Variable       | Purpose                                               |
| -------------- | ----------------------------------------------------- |
| `PORT`         | Listen port (default `3000`)                          |
| `API_ORIGIN`   | Hono API base URL (e.g. `http://api:3001` in compose) |
| `SUPABASE_KEY` | Supabase service role key (server only)               |
| `RAZORPAY_KEY` | Razorpay secret                                       |
| `SENTRY_DSN`   | Optional server error monitoring                      |

See [DEPLOY_NOTES.md](../DEPLOY_NOTES.md) for the full checklist.

## API (Hono)

```bash
docker build -f deploy/api.Dockerfile .
```

### Runtime env

| Variable                                            | Purpose                                                        |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `API_PORT`                                          | Listen port (default `3001`)                                   |
| `DATABASE_URL` or `POSTGRES_URL`                    | Postgres connection (Supabase pooler recommended)              |
| `SUPABASE_URL` / `PUBLIC_SUPABASE_URL`              | Supabase project URL                                           |
| `SUPABASE_ANON_KEY` / `PUBLIC_SUPABASE_KEY`         | Supabase anon key                                              |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_KEY`        | Service role key                                               |
| `API_CORS_ORIGINS`                                  | Comma-separated browser origins (must include the web app URL) |
| `RAZORPAY_KEY`, `PUBLIC_RAZORPAY_ID`                | Checkout / print payments                                      |
| `CLIENT_ID_COOKIE_NAME`, `CLIENT_ID_SIGNING_SECRET` | Guest cart client id                                           |
| `SENTRY_DSN`                                        | Optional error monitoring                                      |

Health check: `GET /health`.

## Wiring web ↔ api

- Set web `API_ORIGIN` to the internal URL of the API container.
- Set API `API_CORS_ORIGINS` to include every browser origin that calls guest cart/checkout mutations (the public web URL).
