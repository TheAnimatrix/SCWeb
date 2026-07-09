-- Phase 5: normalized print request event ledger.

CREATE TABLE IF NOT EXISTS "print_request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"print_request_id" uuid NOT NULL,
	"type" text NOT NULL,
	"actor_user_id" uuid,
	"actor_role" text NOT NULL,
	"amount_paise" integer,
	"provider_order_id" text,
	"provider_payment_id" text,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "print_request_events_print_request_id_created_at_idx"
	ON "print_request_events" ("print_request_id", "created_at" DESC);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "print_request_events" ADD CONSTRAINT "print_request_events_print_request_id_printrequests_id_fk" FOREIGN KEY ("print_request_id") REFERENCES "public"."printrequests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
