-- Phase 5: audit log for money/order state transitions. Service-role only (RLS enabled, no policies).
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_client_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"from_state" text,
	"to_state" text,
	"provider_ids" jsonb,
	"meta" jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_entity_type_entity_id_at_idx" ON "audit_log" ("entity_type", "entity_id", "at");
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
