# Deploy checklist

Newest entries first. Check off each item when done for a given release.

## 2026-07-08 — Auth hardening (wu-4a)

- [ ] **Remove legacy auth callback URL** — `/user/pincode` was deleted from the app. Remove it from **Supabase Auth → Redirect URLs** and from any OAuth provider console redirect/callback lists. Canonical callback is **`/auth/callback`** only.
- [ ] **Apply Supabase migrations (after code deploy)** — run `supabase/migrations/20260708120000_purchases_payment_id_b_unique.sql` and `supabase/migrations/20260708130000_rls_lockdown.sql` against production **after** the new code is live.
- [ ] **Apply API Drizzle migrations** — run pending migrations under `api/drizzle/` (`npm run db:migrate -w @scweb/api` or your usual apply path).
- [ ] **Backfill carts** — `npm run db:backfill-carts -w @scweb/api` after Drizzle migrations.
- [ ] **`POSTGRES_URL`** — set to the Supabase **session pooler** connection string (port 6543), not the direct IPv6-only host.
- [ ] **Supabase keys** — `PUBLIC_SUPABASE_KEY` = anon key (browser); `SUPABASE_KEY` = service role (server only).
- [ ] **API proxy / CORS** — `API_ORIGIN` points at the Hono API; `API_CORS_ORIGINS` includes every browser origin that calls guest cart/checkout mutations (comma-separated).
