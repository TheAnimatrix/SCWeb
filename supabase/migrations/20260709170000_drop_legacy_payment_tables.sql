-- Retire legacy payment/cart tables and provider id columns after ledger backfill.

CREATE TABLE IF NOT EXISTS cart_archive AS TABLE cart;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS purchases;
ALTER TABLE orders DROP COLUMN IF EXISTS razorpay_order_id;
ALTER TABLE orders DROP COLUMN IF EXISTS razorpay_payment_id;
ALTER TABLE printrequests DROP COLUMN IF EXISTS order_id;
ALTER TABLE printrequests DROP COLUMN IF EXISTS payment_id;
