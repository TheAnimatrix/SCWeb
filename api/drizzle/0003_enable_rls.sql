-- Enable RLS on the API-owned tables. No policies are defined on purpose:
-- these tables are accessed exclusively through the Hono API with the service
-- role (which bypasses RLS), so anon/authenticated PostgREST access is denied
-- entirely. Idempotent.
ALTER TABLE "carts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cart_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "upload_quota" ENABLE ROW LEVEL SECURITY;
