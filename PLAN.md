# Production Plan

## Progress log

- **2026-07-08 — wu-0a merged (`f17a70d`)**: Phase 0 security hotfixes complete —
  Razorpay HMAC verification (both endpoints), idempotent finalization + unique
  index migration (`supabase/migrations/20260708120000_...` — **apply before
  deploy**), `payment_pending` state machine, strict cart ownership
  (uid-owned carts require the authenticated user), failure flow moved to
  ownership-checked POST, `cookies.getAll()` leak removed, hardened `clientId`
  cookie, anon/`supabaseAdmin` privilege split (**smoke-test RLS-dependent flows
  before production deploy**), shared server helpers + 8 unit tests (13/13 green).
- **2026-07-08 — wu-1a merged (`f52aaad`)**: Phase 1 api/ skeleton complete —
  Hono app factory (`AppType` exported), identity middleware (verified JWT →
  user; clientId cookie → guest, optional HMAC signing via
  `CLIENT_ID_SIGNING_SECRET`), CSRF (origin required for cookie-authed
  mutations), structured JSON logging, request-id, rate-limit baseline,
  `requireAuth()`, `/health` + masked db probe, typed `hc<AppType>` client wired
  into SvelteKit, cart contracts/status constants, drizzle + fallback schema
  (cart, products). **Pending:** real `drizzle-kit pull` introspection — blocked
  on `POSTGRES_URL` using the direct DB host (IPv6-only, ENOTFOUND locally);
  switch it to the Session pooler connection string, then run
  `npm run db:pull -w @scweb/api`.

- **2026-07-08 — wu-0c merged (`8d8a240`)**: cart UI bugs fixed — `isUpdatingCart`
  deadlock, `checkOut()` crash, negative-qty persistence (extracted
  `resolveCartQuantityChange` pure fn), errors surfaced via toast; +6 tests.
- **2026-07-08 — wu-0d merged (`e5fc190`)**: quality gates — `npm run build`,
  `npm run lint` (ESLint 9 flat config; deferred debt in `LINT_DEBT.md`),
  prettier sweep, `.env.example` complete, `$lib` alias fixed,
  `@sveltejs/adapter-node` (Dokploy).
- **2026-07-08 — wu-0e merged (`6051483`)**: svelte-check **0 errors** (was 128);
  corrected `Chat`/`printrequests` types against the live DB; declared behavior
  fixes: failure redirect guards, pay-button NaN gate, maker-orders username
  query. **PHASE 0 COMPLETE.**
- **2026-07-08 — wu-2a merged (`514ed27`)**: Phase 2 schema — `carts`,
  `cart_items`, `orders`, `order_items` with partial unique indexes, status
  CHECKs, UNIQUE razorpay ids; **money convention: whole INR rupees at rest,
  paise only at the Razorpay boundary (`rupeesToPaise`)**; idempotent
  per-cart-resilient backfill script. Migration `api/drizzle/0001_...` and
  `db:backfill-carts` are **not yet applied/run** — user applies when ready.

- **2026-07-08 — wu-2b merged (`67811a8`)**: cart endpoints — `GET /cart`,
  `PUT /cart/items/:productId` (transactional, stock ceiling, lazy creation,
  `FOR UPDATE`), `POST /cart/merge` (clientId-match guard, clamp-all invariant);
  PGlite integration tests against the real store.
- **2026-07-08 — wu-2c merged (`56d7c1d`)**: checkout endpoints —
  `POST /checkout/order` (snapshot + idempotent re-entry with total refresh),
  `POST /checkout/confirm` (HMAC-first, `FOR UPDATE` + atomic paid claim BEFORE
  stock decrement — concurrent double-decrement impossible), `POST /checkout/fail`
  (paid never downgraded). 71 api tests. **Runtime prerequisites still on user:**
  apply `api/drizzle/0001_...`, run `db:backfill-carts`, fix `POSTGRES_URL`
  to the session pooler.

- **2026-07-08 — wu-2d merged (`3b8161c`)**: frontend swapped onto the typed API
  client via a hardened same-origin proxy (`/api/[...path]` — path allowlist,
  SSRF-safe URL build + regression tests, Origin forwarding for CSRF,
  `safeGetSession`-validated Bearer only, 10s timeout → 502). Legacy
  `src/lib/client/cart.ts` DELETED. Guest-cart merge on sign-in. API cart items
  now carry author/guarantee. **PHASE 2 CODE-COMPLETE.** Runtime activation
  still gated on user: pooler `POSTGRES_URL`, apply `api/drizzle/0001_...` +
  `supabase/migrations/20260708120000_...`, run `db:backfill-carts`, then
  live smoke test + the Playwright checkbox. Cleanup unit (drop
  `get_cart_by_uid`/`update_cart_by_id` RPCs + jsonb list column) runs only
  AFTER live verification.

- **2026-07-08 — wu-3a merged (`96e5ced`)**: print-file endpoints in the API —
  streaming-capped uploads (50MB, forged content-length safe), structural STL
  sniffing, CSPRNG storage keys, race-safe `upload_quota` table
  (migration `api/drizzle/0002_...`, UTC day boundary — intentional change),
  row-authorized signed download URLs, compensating quota decrement + orphan
  cleanup on partial failure.
- **2026-07-08 — wu-3b merged (`918a1c4`)**: all four frontend callers swapped to
  the API via the proxy (streaming, 60s upload timeout, `print-files`
  allowlisted); typed `printFilesApi`; stuck-download-loading bug fixed;
  **Supabase Edge Functions DELETED** (upload/download-model-request).

- **2026-07-08 — wu-3c merged (`16ff6ff`)**: print-request payments on the API —
  amounts exclusively from maker-authored quotes, confirm bound to the
  order-created amount (quote-drift logged), HMAC-first, FOR UPDATE + stage
  claim, purchases parity, cross-order replay blocked; legacy 3dp payment
  `+server.ts` DELETED.
- **2026-07-08 — wu-3d merged (`09549d7`)**: portal mutations server-side —
  `POST /print-requests/:id/actions` (role/stage transition map, server-set
  `by: 'maker'` → quote-forgery vector closed), `POST /chats/messages`
  (participant-checked, actor-derived sender), CreatorStats recalculated
  server-side on completion, `paid_externally` shippable, statsUpdate 403s
  non-owners. **PHASE 3 COMPLETE.** Chat read-receipts remain client-side
  (RLS-dependent — Phase 4).

- **2026-07-08 — wu-4a merged (`eaa000a`) + RLS drafts (`92fc231`)**: Phase 4 code
  complete — validated sessions on every server gate, single canonical
  `/auth/callback` (dead `user/pincode` deleted — **remove from Supabase/OAuth
  redirect allowlists, see DEPLOY_NOTES.md**), `sanitizePostLoginUrl` at write+
  read (length/control-char capped), profile pages on uid-filtered server loads.
  RLS lockdown drafted from a live pg_policies audit: `api/drizzle/0003_enable_rls.sql`
  (new tables deny-by-default) + `supabase/migrations/20260708130000_rls_lockdown.sql`
  (purchases open-INSERT, addresses/reviews uid-spoof, printrequests direct
  UPDATE, CreatorStats self-writes, Chat column-level status grant) — **apply
  after code deploy**. Remaining Phase 4: RLS integration tests + live smoke,
  gated on the DB actions in DEPLOY_NOTES.md.

- **2026-07-08 — wu-5a merged (`bc0137b`), wu-5b merged (`1773c00`)**: Phase 5
  observability + tests (backups excluded per user) — structured JSON logging
  web+api with request-id propagation, Sentry-protocol error reporting
  (optional DSN; GlitchTip-compatible; cookie/auth scrubbing), transactional
  `audit_log` for every money/order transition (migration
  `api/drizzle/0004_...`), Playwright smoke suite (9 green + 2 DB-gated),
  GitHub Actions CI (lint/check/unit/build/e2e), placeholder tests removed.
  **PHASE 5 (obs+tests scope) COMPLETE.** Test counts: 63 root unit + 155 api
  + 9 e2e.

Consolidates `TODO` (2026-07-07), the cart persistence review (2026-07-08), and the
Hono + Drizzle migration into one sequenced plan. `TODO` stays as the raw backlog;
this file is the order of operations.

## Guiding principles

1. **Don't fix things twice.** Anything that dies naturally with the Hono + Drizzle
   migration (RPC quirks, Edge Function CORS, browser-side mutations) gets a hotfix
   now _only if it's exploitable or user-facing today_. Everything else is fixed once,
   in its migrated home.
2. **Money paths first.** Checkout and print-request payments are where correctness
   bugs cost real money. They migrate first and get the deepest tests.
3. **Correct by construction over correct by patch.** Prefer schema constraints
   (unique indexes, CHECKs, state machines) and single-statement/transactional SQL
   over application-level guards. Bugs like duplicate carts, negative quantities,
   and oversell should become _impossible_, not just handled.
4. **The frontend becomes thin.** SvelteKit renders and calls a typed API client.
   No business mutation lives in `+server.ts`, `+page.server.ts` side effects, or
   browser Supabase calls when the migration is done.

---

## Phase 0 — Stop the bleeding (current codebase, no architecture change)

Live vulnerabilities and user-facing breakage. Small, surgical patches to existing
code — all of this gets rebuilt properly in Phases 2–3, but none of it can wait.

### Security hotfixes (P0)

- [ ] Verify Razorpay signatures before marking anything paid.
      HMAC-SHA256 over `order_id|payment_id` with the key secret, constant-time compare.
      Files: `src/routes/(cart)/checkout/createOrder/+server.ts` (PATCH),
      `src/routes/3dp-portal/(authenticated)/user/[id]/+server.ts`.
- [ ] Idempotency guard on payment finalization: reject PATCH if cart/request is
      already `paid`; add a DB unique constraint on the Razorpay payment id.
      (Full idempotent finalization lands in Phase 2; this stops duplicate
      stock decrements and purchase rows today.)
- [ ] Cart ownership on order creation: `createOrder` POST must match the cart
      against the caller's `clientId`/user id, not accept arbitrary `orderId`.
- [ ] Cart failure page: page load mutates any cart to `failed` via admin client.
      Convert to a POST with ownership + provider-state checks, idempotent.
      File: `src/routes/(cart)/summary/failure/[cart_id]/[order_id]/+page.server.ts`.
- [ ] Stop returning `cookies.getAll()` through `+layout.server.ts` page data.
- [ ] Set explicit `httpOnly`, `secure`, `sameSite`, `path`, `maxAge` on the
      `clientId` cookie (`src/hooks.server.ts`).
- [ ] Split Supabase clients by privilege: user-scoped SSR client (anon key +
      cookies) vs `supabaseAdmin` (service role, server-only, used only behind
      explicit ownership checks). Rename so the dangerous one looks dangerous.

### Cart UI bugs (from the 2026-07-08 review)

- [ ] `isUpdatingCart` deadlock: early `return` after setting the flag but before
      `try/finally` in `updateCartQuantity` and `removeItem` permanently disables
      all cart buttons. File: `src/routes/(cart)/cart/+page.svelte` (~L95, ~L157).
- [ ] `checkOut()` crash: reads `productDetailsCache[id].stock` which is undefined
      while details are loading/failed → TypeError instead of a toast.
- [ ] Negative quantity persists: in `changeCart`, only `newQty === 0` removes;
      a relative change landing below zero skips the stock check and writes a
      negative qty. Clamp `newQty <= 0` → remove. File: `src/lib/client/cart.ts`.
- [ ] Surface `changeCart` errors on the cart page (currently `console.error` only;
      the stock-limit message is never shown there).

### Quality gates (prerequisite for validating everything after)

- [ ] `npm run build` passes (missing `PUBLIC_RAZORPAY_ID` env export et al.).
- [ ] `npm run check` passes (34 errors / 82 warnings currently).
- [ ] `npm run lint` passes (Prettier: 154 files) and becomes a CI gate.
- [ ] Add `.env.example` with all required variables (no real secrets).
- [ ] Fix `svelte.config.js` `$lib` alias (`./src/libs` → `./src/lib` or remove).
- [ ] Production adapter (decided 2026-07-08): deploying on **Dokploy** →
      `@sveltejs/adapter-node` for the SvelteKit app. Dockerfiles (web + api)
      are needed before the first Dokploy deploy — scheduled with the Phase 5
      deployment checklist, not now.

---

## Phase 1 — Foundations for the split (Hono + Drizzle skeleton)

Nothing user-visible moves yet; this phase makes migration slices cheap.

- [ ] Repo layout (decided 2026-07-08): Hono service lives in `api/` inside this
      repo with its own `package.json`/`tsconfig`; shared contracts (types, zod
      schemas, status constants) live in `api/src/contracts` and are consumed by
      SvelteKit via the exported Hono client type (`hc<AppType>`) and a TS path
      alias — no separate packages workspace.
- [ ] Drizzle setup in `api/` pointed at the existing Postgres via `POSTGRES_URL`
      (already in `.env`; Supabase's PG is just a connection string — vendor
      independence lives in the schema and queries, not the host). Introspect
      current tables; from here on `drizzle-kit` migrations are the source of
      truth for schema changes.
- [ ] Hono app skeleton with cross-cutting middleware, so every migrated route
      inherits it for free: - identity: verify Supabase JWT → user id, else signed `clientId` cookie →
      anonymous actor (treat `clientId` as a cart hint, not identity) - zod request validation (kills the manual `FormData`/`any` checks) - structured logging (route, request id, user id when safe, order/payment ids) - error monitoring hook - rate limiting baseline (tightened per-endpoint in later phases) - CSRF strategy for state-changing routes (cookie identity ⇒ CSRF token or
      strict same-site + origin checks)
- [ ] Typed API client in `packages/shared` (Hono RPC client or generated types) —
      the only way `apps/web` talks to the API.
- [ ] Centralize status strings as typed constants/enums in `packages/shared`
      (cart, purchase, print-request states) — needed before state machines.
- [ ] CI: build + check + lint + test gates on both apps.

---

## Phase 2 — Cart & checkout vertical slice (first real migration)

The money path. Replaces the client-side Supabase-RPC cart entirely; the bug list
from the cart review dies here by design, not by patching.

### Schema (Drizzle migrations)

- [ ] `carts`: `id, user_id, client_id, status, created_at, updated_at`.
      Partial unique indexes — `(user_id) WHERE status='active'` and
      `(client_id) WHERE status='active' AND user_id IS NULL` — make duplicate
      active carts impossible (today: every visitor gets a cart row on page load,
      and concurrent loads create duplicates that `selectActiveCart` papers over).
- [ ] `cart_items`: `cart_id, product_id, qty CHECK (qty > 0)`,
      unique `(cart_id, product_id)`. Normalizing out of the jsonb `list` blob
      kills the whole-list read-modify-write race (today: last write wins,
      concurrent changes silently dropped).
- [ ] **No prices stored in the cart.** Price live at read/checkout; snapshot into
      `orders` / `order_items` at order creation. Kills the staleness class
      (today: stored `item.price` drives the subtotal while rows and the actual
      charge use live price — they can disagree).
- [ ] `orders` / `order_items`: price + name snapshot, address (validated,
      structured — not a raw JSON string), Razorpay ids.
      Constraints: one purchase per successful payment id; one paid order per cart;
      status CHECK enforcing the state machine
      `active → payment_pending → paid → fulfilled/cancelled/refunded`
      (no paid → active/failed transitions).
- [ ] Backfill: migrate active carts from `cart.list` jsonb into the new tables.

### API (Hono)

- [ ] `GET /cart` — cart + live-priced items joined with product name/image/stock +
      server-computed totals. **Never creates rows.**
- [ ] `PUT /cart/items/:productId { qty, mode: 'set' | 'add' }` — one endpoint for
      add/update/remove: resulting qty ≤ 0 deletes; otherwise a single
      `INSERT ... ON CONFLICT DO UPDATE` with the stock ceiling checked in the same
      transaction. Lazily creates the active cart here — the only place.
- [ ] `POST /cart/merge` — on login, fold guest cart into user cart (sum quantities,
      clamp to stock), delete guest cart. Fixes silent guest-cart loss (confirmed:
      the current RPC matches only `uid` when logged in).
- [ ] `POST /checkout/order` — transaction: re-validate stock, snapshot priced
      items + validated address into `orders`, create Razorpay order with the
      server-computed amount.
- [ ] `POST /checkout/confirm` — verify HMAC first, then one transaction:
      `UPDATE products SET stock = stock - qty WHERE id = ... AND stock >= qty`
      (atomic oversell guard — also closes the long-standing "can add to cart with
      no stock" item), mark order paid, insert purchase. 409 on guard failure.
      Idempotent: safe to retry, duplicate confirms are no-ops.
- [ ] Payment failure/abandon endpoint (replaces the failure-page side effect):
      idempotent, ownership-checked, defined behavior for abandoned modal /
      failed payment / duplicate callback. Consider Razorpay webhooks as the
      final source of truth; client callbacks only submit proof.
- [ ] Don't store payment signatures in user-visible records; keep only what audit
      needs, server-side.

### Frontend (SvelteKit)

- [ ] Replace `src/lib/client/cart.ts` with a thin `cartApi` module + one cart
      store fed only by API responses; optimistic item-count update with rollback.
- [ ] Cart page drops `productDetailsCache` / per-row `getItemDetails` — the API
      returns items pre-joined (removes the Phase 0 crash and error-surfacing
      patches for good).
- [ ] Swap route by route: cart page → product page add-to-cart → checkout.
- [ ] Call `POST /cart/merge` after successful login.

### Cleanup + tests

- [ ] Drop `get_cart_by_uid` / `update_cart_by_id` RPCs, the jsonb `list` column,
      and the browser-side cart insert path.
- [ ] Checkout/payment unit tests: invalid cart id, cart not owned by caller,
      wrong signature, duplicate confirm, out-of-stock, price mismatch, empty cart,
      merge-on-login, concurrent quantity updates.
- [ ] Playwright smoke: cart add/remove, checkout guard.

---

## Phase 3 — Print requests, files, and the 3dp portal

Same treatment as checkout; retires the Edge Functions.

- [ ] Move upload/download from Supabase Edge Functions into Hono, then delete
      `supabase/functions/upload-model-request.ts` and `download-model-request.ts`.
      In the move (not before — CORS `*`, extension-only validation etc. die with
      the functions): - download authorizes by `printrequest_id` → row → `user_id`/`creator_id`
      check → signed URL for _that row's_ path (never a user-supplied path) - upload: random storage keys, size limit, basic STL structure validation,
      sanitized metadata, `upsert: false`, private bucket - quota enforced in a transaction / unique-constraint table (race-safe) - rate limits + logging of user id/IP/UA; malware/abuse controls
- [ ] Print-request payment flow gets the Phase 2 payment pattern: server-owned
      amounts (never trust client `amount` or event history), signature
      verification, idempotency, state machine
      `requested → quoted → order_created → paid → shipped/completed/cancelled`.
- [ ] Maker stats update: require `user.id === maker_id` (or admin role).
- [ ] Move browser writes to `Chat` / `printrequests` (maker + user portal pages)
      into authenticated Hono endpoints.
- [ ] Print-request payment tests: pay someone else's request, wrong amount,
      duplicate payment, invalid signature, missing quote, invalid address.
- [ ] Edge-function replacement tests: upload/download authorization, quota,
      size/type rejection, signed URLs.

---

## Phase 4 — Remaining API surface + auth hardening

- [ ] Migrate profile / orders / addresses / reviews / maker-application mutations
      to the Hono API; sensitive profile pages load via server with explicit
      ownership (replaces `+page.ts` browser reads).
- [ ] `getUser()` (validated) instead of `getSession()` for trusted checks
      everywhere; single auth callback route (remove the `user/pincode` duplicate);
      `postLogin` redirects restricted to same-origin relative paths.
- [ ] Audit every remaining admin-client query for ownership checks
      (search: `supabaseServer` / `supabaseAdmin`).
- [ ] RLS endgame: with mutations behind Hono, browser Supabase shrinks to
      auth + (maybe) reads. Document per-table policy expectations for whatever
      remains browser-accessible; test that one user cannot touch another's rows
      (carts, addresses, purchases, printrequests, chats, filaments, creator stats).
      Supabase Auth/Storage stay only as intentional choices, not the data layer.

---

## Phase 5 — Observability, operations, resilience

Some of this lands incrementally from Phase 1 middleware; this phase completes it.

- [ ] Replace remaining `console.*` scatter with the structured logger.
- [ ] Error monitoring across web app, API, and payment/upload failures.
- [ ] Audit log for money/order state changes: who, old → new state, provider ids,
      timestamp.
- [ ] Refund/cancel/retry story wired to the state machines (define what support
      can do, and what happens on partial failures).
- [ ] Backups: DB backups, storage backup policy for models, restore drill for
      orders/purchases.
- [ ] Deployment checklist: env vars, migrations, RLS verification, private
      buckets, Razorpay webhook secret, CORS origins, CI gates.
- [ ] Playwright smoke suite complete: home, product detail, cart, checkout guard,
      auth redirect, maker portal guard, upload happy-path stub.
- [ ] Replace placeholder tests (`tests/test.ts`, `src/index.test.ts`).

---

## Phase 6 — Quality debt (P2, continuous but scheduled)

Do opportunistically inside earlier phases when touching a file; sweep the rest here.

- [ ] Shared domain types (`PrintRequest`, `PrintRequestEvent`, `PaymentIds`,
      `RazorpayCheckoutResponse`, `MakerApplication`, `Filament`, `CreatorStats`);
      remove broad `any` from domain data.
- [ ] Import generated DB types properly in `src/app.d.ts` (post-Drizzle these come
      from the Drizzle schema, not Supabase codegen).
- [ ] Svelte 5 migration cleanup: `$state()` typing, bindables, deprecated
      `<slot>`, non-reactive updates; Bits UI version/API alignment.
- [ ] Naming normalization (`supabase_lt`, `payment_id_a`/`paymentIdA`,
      `PrintingCrafters`, …) and removal of large commented-out blocks
      (cart, payment, model viewer, checkout, portals — git is the history).
- [ ] Delete dead/generated files (timestamped vite configs, sample components,
      `src/index.test.js`).
- [ ] Rule enforced from Phase 2 onward, swept here: loads read, endpoints mutate —
      no side effects in `load`.
- [ ] Accessibility pass: label/control association, `aria-label` on icon buttons,
      keyboard support on interactive elements; unused CSS selectors; replace
      `alert()` with toasts; loading/error states for Razorpay + model
      upload/download; mobile checks for cart/checkout/portal/viewer/upload.

---

## Parallel track — decisions needed (blocks parts of Phases 2–3)

- [ ] **Payouts model** (decide before the `orders` schema is considered final):
      platform account + manual batches vs Razorpay Route/split settlements vs
      another provider. Drives accounting, refunds, GST, disputes, maker KYC,
      payout reconciliation — and possibly an `order_items.maker_id` +
      settlement tables in the Phase 2 schema.
- [ ] Razorpay webhooks vs client-callback-plus-verification as the final payment
      truth (recommendation: webhooks; callbacks as fast-path only).

## Product backlog (preserved from TODO, unscheduled)

Username auto-generation for Google login · profile picture upload · maker
verification email · Fabbly color/material picker fixes (animation, mobile,
dragging, infill display) · strength selection description · Z-axis constraint +
maker-adjustable area constraints + pre-quote model area check · available-makers
material filter · model download error handling and STL failure fallback
(ties into Phase 6 loading/error-state work).
