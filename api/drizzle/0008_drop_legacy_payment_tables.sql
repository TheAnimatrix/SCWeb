-- Retire legacy payment/cart tables and provider id columns after ledger backfill.

CREATE TABLE IF NOT EXISTS cart_archive AS TABLE cart;
--> statement-breakpoint
DROP TABLE IF EXISTS cart;
--> statement-breakpoint
DROP TABLE IF EXISTS purchases;
--> statement-breakpoint
ALTER TABLE orders DROP COLUMN IF EXISTS razorpay_order_id;
--> statement-breakpoint
ALTER TABLE orders DROP COLUMN IF EXISTS razorpay_payment_id;
--> statement-breakpoint
ALTER TABLE printrequests DROP COLUMN IF EXISTS order_id;
--> statement-breakpoint
ALTER TABLE printrequests DROP COLUMN IF EXISTS payment_id;
