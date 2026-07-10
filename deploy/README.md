# Dokploy — single container (web + API)

One Docker image runs both the SvelteKit web app (port **3000**) and the Hono API (port **3001**). Build from the repository root.

## Build

```bash
docker build .
```

No build args or environment variables are required — all configuration is injected at **runtime** via Dokploy's Environment tab.

## Dokploy setup

Create **one** application pointing at the root `Dockerfile`, then map **two domains** to the same container:

| Domain                            | Container port | Service       |
| --------------------------------- | -------------- | ------------- |
| Main site (e.g. `selfcrafted.in`) | **3000**       | SvelteKit web |
| `api.selfcrafted.in`              | **3001**       | Hono API      |

Traefik (via Dokploy) routes each hostname to the matching exposed port.

## Runtime environment

Set all variables on the Dokploy application at **runtime** (Environment tab). Do not pass them as Docker build args.

| Variable                                     | Required | Purpose                                                                                         |
| -------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `POSTGRES_URL`                               | Yes      | Postgres connection string — use the Supabase **session pooler** (port 5432 on the pooler host) |
| `PUBLIC_SUPABASE_URL` / `SUPABASE_URL`       | Yes      | Supabase project URL                                                                            |
| `PUBLIC_SUPABASE_KEY` / `SUPABASE_ANON_KEY`  | Yes      | Supabase anon key (browser + API)                                                               |
| `SUPABASE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Service role key (server only)                                                                  |
| `RAZORPAY_KEY`                               | Yes      | Razorpay secret                                                                                 |
| `PUBLIC_RAZORPAY_ID`                         | Yes      | Razorpay key id                                                                                 |
| `PUBLIC_IS_PRODUCTION`                       | Yes      | `true` in production; set to `false` for local/staging                                          |
| `PUBLIC_SITE_URL`                            | No       | Canonical site URL (OAuth redirects)                                                            |
| `PUBLIC_VERCEL_URL`                          | No       | Optional hosting URL fallback                                                                   |
| `API_CORS_ORIGINS`                           | Yes      | Comma-separated browser origins, e.g. `https://selfcrafted.in,https://www.selfcrafted.in`       |
| `SMTP_HOST`                                  | Yes\*    | SMTP host for transactional mail (e.g. `smtp.resend.com`)                                       |
| `SMTP_PORT`                                  | No       | Defaults to `587` (STARTTLS). Use `465` for implicit TLS (Resend recommended)                     |
| `SMTP_USER`                                  | Yes\*    | SMTP username (e.g. `resend`)                                                                   |
| `SMTP_PASS` / `SMTP_PASSWORD`                | Yes\*    | SMTP password / API key                                                                         |
| `SMTP_SECURE`                                | No       | Ignored on ports `465`/`587` — port selects TLS mode automatically                              |
| `EMAIL_FROM`                                 | No       | Defaults to `Selfcrafted <noreply@selfcrafted.in>`                                              |
| `ORDERS_INBOX_EMAIL`                         | No       | Defaults to `orders@selfcrafted.in` — receives order/quote ops copies                           |
| `SENTRY_DSN`                                 | No       | Server error monitoring (web + API processes)                                                   |
| `PUBLIC_SENTRY_DSN`                          | No       | Browser error monitoring                                                                        |
| `CLIENT_ID_SIGNING_SECRET`                   | No       | Guest cart client-id signing                                                                    |

`API_ORIGIN` is forced to `http://127.0.0.1:3001` inside the container so the web app proxies `/api` to the co-located API process. **Do not** set it to `https://api.yourdomain` — that breaks file uploads (`api_unreachable` / 502).

`BODY_SIZE_LIMIT` defaults to `55M` so quote-request STL uploads (up to 50MB) pass through the SvelteKit server. The adapter-node default is only `512K`.

\*SMTP vars are required for order / 3DP quote / status / chat emails. Without `SMTP_HOST` + `SMTP_PASS`, the API starts but every send is skipped (`email.skipped`). Check `GET /health` → `mail.smtpConfigured` after deploy.

## GitHub deploy status

The **Deploy** workflow (`.github/workflows/deploy.yml`) shows Dokploy build/deploy results in GitHub Actions on every push to `master` / `main`. It does **not** trigger a second deploy — keep **Auto Deploy** enabled in Dokploy; the workflow only polls the deployment the Dokploy webhook starts.

Add these repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Where to find it |
| ------ | ---------------- |
| `DOKPLOY_URL` | Your Dokploy instance URL, e.g. `https://dokploy.yourdomain.com` (no trailing slash) |
| `DOKPLOY_API_KEY` | Dokploy → **Profile** → API / CLI keys |
| `DOKPLOY_APPLICATION_ID` | Open the app in Dokploy — the ID is in the URL or application settings |

After the next push, the Actions tab shows **Deploy** with ✅ or ❌ matching the Dokploy deployment outcome.

## How traffic flows

- **Browsers → main domain** — hit the web app on port 3000. Authenticated `/api` calls go through the SvelteKit proxy (`API_ORIGIN` → `127.0.0.1:3001`).
- **Browsers → `api.selfcrafted.in`** — reach the API directly on port 3001. Guest cart / checkout mutations that need CORS must list the main site in `API_CORS_ORIGINS`. Direct API calls are **anonymous by design** (host-scoped cookies do not cross domains).

Health checks: `GET /` (web, port 3000) and `GET /health` (API, port 3001).

See [DEPLOY_NOTES.md](../DEPLOY_NOTES.md) for release checklists and migrations.
