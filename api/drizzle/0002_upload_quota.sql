-- Phase 3: race-safe daily upload quota counter (new table only)
CREATE TABLE IF NOT EXISTS "upload_quota" (
	"user_id" uuid NOT NULL,
	"quota_date" date DEFAULT CURRENT_DATE NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "upload_quota_user_id_quota_date_pk" PRIMARY KEY("user_id","quota_date")
);
