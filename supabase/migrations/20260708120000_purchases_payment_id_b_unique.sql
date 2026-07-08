-- Prevent duplicate paid purchases for the same Razorpay payment id.
CREATE UNIQUE INDEX IF NOT EXISTS purchases_razorpay_payment_id_b_paid_unique
ON purchases (payment_id_b)
WHERE payment_id_b IS NOT NULL AND payment_status = 'paid';
