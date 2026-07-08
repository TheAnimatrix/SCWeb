# Dokploy — single container (web + API)

One Docker image runs both the SvelteKit web app (port **3000**) and the Hono API (port **3001**). Build from the repository root.

## Build

```bash
docker build \
  --build-arg PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg PUBLIC_SUPABASE_KEY=your-anon-key \
  --build-arg PUBLIC_RAZORPAY_ID=your-razorpay-key-id \
  --build-arg PUBLIC_IS_PRODUCTION=true \
  --build-arg PUBLIC_SITE_URL=https://your-main-domain \
  --build-arg PUBLIC_VERCEL_URL= \
  --build-arg PUBLIC_SENTRY_DSN= \
  .
```

### Build args

Only **public** `PUBLIC_*` values are baked in at build time. **Private secrets** (`SUPABASE_KEY`, `RAZORPAY_KEY`, `SENTRY_DSN`, etc.) are read at **runtime** only — the Docker build does not need them and they must not be passed as build args.

| Arg                    | Purpose                              |
| ---------------------- | ------------------------------------ |
| `PUBLIC_SUPABASE_URL`  | Supabase project URL                 |
| `PUBLIC_SUPABASE_KEY`  | Supabase anon key                    |
| `PUBLIC_RAZORPAY_ID`   | Razorpay key id                      |
| `PUBLIC_IS_PRODUCTION` | `true` in production                 |
| `PUBLIC_SITE_URL`      | Canonical site URL (OAuth redirects) |
| `PUBLIC_VERCEL_URL`    | Optional hosting URL fallback        |
| `PUBLIC_SENTRY_DSN`    | Optional browser error monitoring    |

## Dokploy setup

Create **one** application pointing at the root `Dockerfile`, then map **two domains** to the same container:

| Domain                            | Container port | Service       |
| --------------------------------- | -------------- | ------------- |
| Main site (e.g. `selfcrafted.in`) | **3000**       | SvelteKit web |
| `api.selfcrafted.in`              | **3001**       | Hono API      |

Traefik (via Dokploy) routes each hostname to the matching exposed port.

## Runtime environment

Set these on the Dokploy application at **runtime** (never as Docker build args):

| Variable                                     | Required | Purpose                                                                                         |
| -------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `POSTGRES_URL`                               | Yes      | Postgres connection string — use the Supabase **session pooler** (port 5432 on the pooler host) |
| `PUBLIC_SUPABASE_URL` / `SUPABASE_URL`       | Yes      | Supabase project URL                                                                            |
| `PUBLIC_SUPABASE_KEY` / `SUPABASE_ANON_KEY`  | Yes      | Supabase anon key (browser + API)                                                               |
| `SUPABASE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Service role key (server only)                                                                  |
| `RAZORPAY_KEY`                               | Yes      | Razorpay secret                                                                                 |
| `PUBLIC_RAZORPAY_ID`                         | Yes      | Razorpay key id (also baked at build time)                                                      |
| `API_CORS_ORIGINS`                           | Yes      | Comma-separated browser origins, e.g. `https://selfcrafted.in,https://www.selfcrafted.in`       |
| `SENTRY_DSN`                                 | No       | Server error monitoring (web + API processes)                                                   |
| `PUBLIC_SENTRY_DSN`                          | No       | Browser error monitoring (set at build time)                                                    |
| `CLIENT_ID_SIGNING_SECRET`                   | No       | Guest cart client-id signing                                                                    |

`API_ORIGIN` defaults to `http://127.0.0.1:3001` inside the container so the web app proxies `/api` to the co-located API process. You normally **do not** override this.

## How traffic flows

- **Browsers → main domain** — hit the web app on port 3000. Authenticated `/api` calls go through the SvelteKit proxy (`API_ORIGIN` → `127.0.0.1:3001`).
- **Browsers → `api.selfcrafted.in`** — reach the API directly on port 3001. Guest cart / checkout mutations that need CORS must list the main site in `API_CORS_ORIGINS`. Direct API calls are **anonymous by design** (host-scoped cookies do not cross domains).

Health checks: `GET /` (web, port 3000) and `GET /health` (API, port 3001).

See [DEPLOY_NOTES.md](../DEPLOY_NOTES.md) for release checklists and migrations.
