-- RLS lockdown for legacy tables, derived from a live policy audit (2026-07-08).
-- Context: all business mutations now go through the Hono API (service role,
-- bypasses RLS). Browser clients need read access + a few narrow writes.
-- DO NOT APPLY until the Phase 2/3 code is deployed — these drops break the
-- OLD client-side write paths by design.

-- 1. printrequests: users/makers could UPDATE their rows directly (PostgREST),
--    which allowed forging quote events / stages. All mutations now via
--    POST /print-requests/:id/actions and the payments endpoints.
DROP POLICY IF EXISTS "Users can update their own print requests" ON "printrequests";
DROP POLICY IF EXISTS "Makers can update requests assigned to them" ON "printrequests";
-- (INSERT by owner and both SELECT policies stay: request creation still
-- happens client-side via the upload flow's row, reads power the portals.)

-- 2. purchases: `anyone` INSERT (with_check TRUE) let any caller insert
--    arbitrary purchase rows. Purchases are inserted by the API only.
DROP POLICY IF EXISTS "anyone" ON "purchases";

-- 3. cart (legacy jsonb table): open INSERT no longer needed — the new carts
--    tables own the flow; legacy table is read-only until dropped in cleanup.
DROP POLICY IF EXISTS "anyone can insert" ON "cart";

-- 4. addresses and 5. reviews: the open INSERT policies are replaced by
--    20261115120000_printing_maker_privacy_and_review_checks.sql and
--    20261116000000_review_ownership_checks.sql, which were applied to production first.
--    Nothing to do here. Do NOT add "addresses_insert_own" / "reviews_insert_own" again:
--    Postgres ORs permissive policies, so a looser INSERT rule would override the stricter
--    "not your own listing" review rule.

-- 6. CreatorStats: makers could INSERT/UPDATE their own computed stats
--    (fake completed_orders / ratings). Stats are recalculated server-side
--    on completion and via the owner-gated statsUpdate route (admin client).
DROP POLICY IF EXISTS "Allow individual maker write access" ON "CreatorStats";
DROP POLICY IF EXISTS "Allow individual maker update access" ON "CreatorStats";

-- 7. Chat: inserts now go through POST /chats/messages (service role).
DROP POLICY IF EXISTS "Allow insert for sender" ON "Chat";
--    Read receipts remain client-side, but the recipient UPDATE policy allowed
--    rewriting *any* column (including message content) of received messages.
--    RLS is row-level only, so narrow the columns with grants instead:
REVOKE UPDATE ON "Chat" FROM authenticated;
REVOKE UPDATE ON "Chat" FROM anon;
GRANT UPDATE (status) ON "Chat" TO authenticated;
-- (The "Allow recipient to update status" row policy stays and now composes
-- with the column grant: recipients may update only `status` on their rows.)
