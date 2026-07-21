-- Platform makers table: separate identity from PrintingCrafters (3DP capability subset).

CREATE TABLE IF NOT EXISTS "makers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"approved_state" text DEFAULT 'pending' NOT NULL,
	"application" jsonb,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "makers_approved_state_check" CHECK (approved_state IN ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "makers" ADD CONSTRAINT "makers_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
-- Grandfather existing marketplace sellers who already have listings.
INSERT INTO "makers" ("id", "display_name", "approved_state", "created_at", "updated_at")
SELECT DISTINCT
	p."uid",
	u."username",
	'approved',
	COALESCE(u."created_at"::timestamptz, now()),
	now()
FROM "products" p
INNER JOIN "users" u ON u."id" = p."uid"
WHERE p."uid" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
-- Backfill from PrintingCrafters (may override display name / approval state).
INSERT INTO "makers" ("id", "display_name", "approved_state", "approved_at", "created_at", "updated_at")
SELECT
	pc."maker_id",
	pc."name",
	COALESCE(pc."approved_state", 'pending'),
	CASE WHEN pc."approved_state" = 'approved' THEN pc."created_at" ELSE NULL END,
	COALESCE(pc."created_at", now()),
	now()
FROM "PrintingCrafters" pc
ON CONFLICT ("id") DO UPDATE SET
	"display_name" = COALESCE(EXCLUDED."display_name", "makers"."display_name"),
	"approved_state" = EXCLUDED."approved_state",
	"approved_at" = COALESCE(EXCLUDED."approved_at", "makers"."approved_at"),
	"updated_at" = now();
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "PrintingCrafters" ADD CONSTRAINT "PrintingCrafters_maker_id_makers_id_fk" FOREIGN KEY ("maker_id") REFERENCES "public"."makers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
