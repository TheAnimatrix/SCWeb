-- Interest checks: listings that collect "I'd buy this" before the maker produces them.
-- Both tables are service-role only (RLS enabled, no policies): browsers must not read them.
CREATE TABLE IF NOT EXISTS "interest_campaigns" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"target_count" integer NOT NULL,
	"ships_within_days" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"note" text,
	"launched_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"launch_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interest_campaigns_status_check" CHECK ("status" IN ('open', 'launched', 'closed')),
	CONSTRAINT "interest_campaigns_target_count_check" CHECK ("target_count" BETWEEN 1 AND 10000),
	CONSTRAINT "interest_campaigns_ships_within_days_check" CHECK ("ships_within_days" BETWEEN 1 AND 365),
	CONSTRAINT "interest_campaigns_note_check" CHECK (char_length("note") <= 500),
	CONSTRAINT "interest_campaigns_launch_message_check" CHECK (char_length("launch_message") <= 1000)
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "interest_campaigns" ADD CONSTRAINT "interest_campaigns_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"notified_at" timestamp with time zone,
	CONSTRAINT "product_interests_product_id_user_id_key" UNIQUE ("product_id", "user_id")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "product_interests" ADD CONSTRAINT "product_interests_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_interests_product_id_idx" ON "product_interests" ("product_id");
--> statement-breakpoint
ALTER TABLE "interest_campaigns" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "product_interests" ENABLE ROW LEVEL SECURITY;
