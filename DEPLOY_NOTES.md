# Deploy checklist

Newest entries first. Check off each item when done for a given release.

## 2026-07-08 — Auth hardening (wu-4a)

- [ ] **Remove legacy auth callback URL** — `/user/pincode` was deleted from the app. Remove it from **Supabase Auth → Redirect URLs** and from any OAuth provider console redirect/callback lists. Canonical callback is **`/auth/callback`** only.
- [x] **Apply purchases unique-index migration** — applied 2026-07-08 via Supabase MCP (`purchases_payment_id_b_unique`; duplicate precheck was clean).
- [ ] **Apply RLS lockdown** — `supabase/migrations/20260708130000_rls_lockdown.sql` — **HELD: apply only after the new code is live on Dokploy** (it breaks legacy client-side write paths by design).
- [x] **Apply API Drizzle migrations** — 0001–0004 applied 2026-07-08 via Supabase MCP; verified: `carts`, `cart_items`, `orders`, `order_items`, `upload_quota`, `audit_log` all exist with RLS enabled.
- [x] **Backfill carts** — done 2026-07-08 via SQL (only 1 active legacy cart with items existed; migrated with owner mapping + product check; idempotent).
- [ ] **`POSTGRES_URL`** — set to a Supabase **pooler** connection string (not the direct IPv6-only host). **Session pooler** uses port **5432** on the pooler host (recommended); **Transaction pooler** uses port **6543**. Either works with this codebase (`prepare: false`, single-connection transactions).
- [ ] **Supabase keys** — `PUBLIC_SUPABASE_KEY` = anon key (browser); `SUPABASE_KEY` = service role (server only).
- [ ] **API proxy / CORS** — `API_ORIGIN` points at the Hono API; `API_CORS_ORIGINS` includes every browser origin that calls guest cart/checkout mutations (comma-separated).
