-- The customer's shipping address is written to printrequests.address when they press Pay,
-- before the payment is confirmed. The policy below let the assigned maker read the whole
-- row, address included, with a direct query at any stage.
--
-- Makers never read print requests with their own database client: every maker page loads
-- through the server with the service role, which strips the address until the request is
-- paid. So the policy is not needed, and removing it closes the direct route.
-- Customers keep "Users can view their own print requests".
DROP POLICY IF EXISTS "Makers can view requests assigned to them" ON "printrequests";
