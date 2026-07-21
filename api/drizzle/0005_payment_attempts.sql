-- Phase 3: unified payment_attempts table for cart orders and print requests.

CREATE TABLE IF NOT EXISTS "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_order_id" text NOT NULL,
	"provider_payment_id" text,
	"amount_paise" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_kind_check" CHECK (kind IN ('cart_order', 'print_request')),
	CONSTRAINT "payment_attempts_status_check" CHECK (status IN ('pending', 'paid', 'failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempts_provider_order_id_unique" ON "payment_attempts" ("provider_order_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempts_provider_payment_id_paid_unique" ON "payment_attempts" ("provider_payment_id") WHERE provider_payment_id IS NOT NULL AND status = 'paid';
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "active_payment_attempt_id" uuid;
--> statement-breakpoint
ALTER TABLE "printrequests" ADD COLUMN IF NOT EXISTS "active_payment_attempt_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "orders" ADD CONSTRAINT "orders_active_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("active_payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "printrequests" ADD CONSTRAINT "printrequests_active_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("active_payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
