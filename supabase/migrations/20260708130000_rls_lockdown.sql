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

-- 4. addresses: INSERT allowed any authenticated user to write rows with an
--    arbitrary uid (into other users' address books). Constrain to self.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "addresses";
CREATE POLICY "addresses_insert_own" ON "addresses"
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = uid);

-- 5. reviews: same uid-spoof problem on INSERT. Constrain to self.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "reviews";
CREATE POLICY "reviews_insert_own" ON "reviews"
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

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
