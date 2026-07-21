-- Harden maker experience: RLS, listing defaults, pending-application uniqueness, orphan maker_ids.

-- ---------------------------------------------------------------------------
-- Safe maker_id cleanup (in case prior backfill left orphans before FK)
-- ---------------------------------------------------------------------------
UPDATE public.products p
SET maker_id = NULL
WHERE p.maker_id IS NOT NULL
	AND NOT EXISTS (SELECT 1 FROM public.makers m WHERE m.id = p.maker_id);

UPDATE public.products p
SET maker_id = p.uid
WHERE p.maker_id IS NULL
	AND p.uid IS NOT NULL
	AND EXISTS (SELECT 1 FROM public.makers m WHERE m.id = p.uid);

-- New products must go through listing review by default (existing live rows unchanged).
ALTER TABLE public.products
	ALTER COLUMN listing_state SET DEFAULT 'draft';

-- Clear denormalized application payloads (canonical store is maker_applications).
UPDATE public.makers
SET application = NULL
WHERE application IS NOT NULL;

-- One pending application per user (prevents concurrent apply races).
CREATE UNIQUE INDEX IF NOT EXISTS maker_applications_one_pending_per_user
	ON public.maker_applications (user_id)
	WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- Harden makers RLS: no client self-approve; no cross-user application reads
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS makers_select_authenticated ON public.makers;
DROP POLICY IF EXISTS makers_insert_own ON public.makers;
DROP POLICY IF EXISTS makers_update_own_pending ON public.makers;
DROP POLICY IF EXISTS makers_select_own ON public.makers;
DROP POLICY IF EXISTS makers_select_public_profile ON public.makers;

-- Owners can read their own maker row (including pending).
CREATE POLICY makers_select_own ON public.makers
	FOR SELECT TO authenticated
	USING (id = auth.uid());

-- Anyone can read approved live storefront profile fields via table select;
-- application jsonb is cleared above and no longer written by the API.
CREATE POLICY makers_select_public_profile ON public.makers
	FOR SELECT TO anon, authenticated
	USING (approved_state = 'approved' AND storefront_state IN ('live', 'paused'));

-- Client inserts/updates of makers go through the service-role API only (no INSERT/UPDATE policies).
-- maker_applications remains the client-writable application trail where needed.
