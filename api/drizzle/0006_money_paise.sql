-- Phase 4: canonical money storage in integer paise.

ALTER TABLE "orders" RENAME COLUMN "subtotal" TO "subtotal_paise";
--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "delivery_fee" TO "delivery_fee_paise";
--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "total" TO "total_paise";
--> statement-breakpoint
UPDATE "orders"
SET
	"subtotal_paise" = "subtotal_paise" * 100,
	"delivery_fee_paise" = "delivery_fee_paise" * 100,
	"total_paise" = "total_paise" * 100;
--> statement-breakpoint
ALTER TABLE "order_items" RENAME COLUMN "unit_price" TO "unit_price_paise";
--> statement-breakpoint
UPDATE "order_items" SET "unit_price_paise" = "unit_price_paise" * 100;
