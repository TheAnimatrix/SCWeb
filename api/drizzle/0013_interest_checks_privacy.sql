-- Interest checks, privacy and abuse review fixes.
-- `commitment_locked_at`: set the first time anyone joins; from then on the target, the shipping
-- time and the check itself are fixed, even if everyone later leaves.
-- `notified_count`: how many people have been e-mailed the launch or closure notice. Needed
-- because a closure notice deletes the person's row once it has been sent.
ALTER TABLE "interest_campaigns" ADD COLUMN IF NOT EXISTS "commitment_locked_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "interest_campaigns" ADD COLUMN IF NOT EXISTS "notified_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "interest_campaigns" AS c SET "commitment_locked_at" = now()
WHERE c."commitment_locked_at" IS NULL
	AND EXISTS (SELECT 1 FROM "product_interests" AS i WHERE i."product_id" = c."product_id");
--> statement-breakpoint
-- Leaving a list now deletes the row. `withdrawn_at` is kept (unused) so that an API still
-- running the previous release keeps working until the new one is deployed.
DELETE FROM "product_interests" WHERE "withdrawn_at" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_interests_user_id_idx" ON "product_interests" ("user_id");
--> statement-breakpoint
-- When each person was last sent the "you're on the list" e-mail for a listing, so leaving and
-- re-joining cannot be used to send someone repeated e-mails. No personal details.
CREATE TABLE IF NOT EXISTS "interest_join_notices" (
	"product_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interest_join_notices_pkey" PRIMARY KEY ("product_id", "user_id")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "interest_join_notices" ADD CONSTRAINT "interest_join_notices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "interest_join_notices" ENABLE ROW LEVEL SECURITY;
