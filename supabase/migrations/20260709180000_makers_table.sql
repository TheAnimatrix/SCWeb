-- Platform makers table: separate identity from PrintingCrafters (3DP capability subset).

CREATE TABLE IF NOT EXISTS public.makers (
	id uuid PRIMARY KEY NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
	display_name text,
	approved_state text NOT NULL DEFAULT 'pending' CHECK (approved_state IN ('pending', 'approved', 'rejected')),
	application jsonb,
	approved_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grandfather existing marketplace sellers who already have listings.
INSERT INTO public.makers (id, display_name, approved_state, created_at, updated_at)
SELECT DISTINCT
	p.uid,
	u.username,
	'approved',
	COALESCE(u.created_at::timestamptz, now()),
	now()
FROM public.products p
INNER JOIN public.users u ON u.id = p.uid
WHERE p.uid IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Backfill from PrintingCrafters (may override display name / approval state).
INSERT INTO public.makers (id, display_name, approved_state, approved_at, created_at, updated_at)
SELECT
	pc.maker_id,
	pc.name,
	COALESCE(pc.approved_state, 'pending'),
	CASE WHEN pc.approved_state = 'approved' THEN pc.created_at ELSE NULL END,
	COALESCE(pc.created_at, now()),
	now()
FROM public."PrintingCrafters" pc
ON CONFLICT (id) DO UPDATE SET
	display_name = COALESCE(EXCLUDED.display_name, makers.display_name),
	approved_state = EXCLUDED.approved_state,
	approved_at = COALESCE(EXCLUDED.approved_at, makers.approved_at),
	updated_at = now();

ALTER TABLE public."PrintingCrafters"
	DROP CONSTRAINT IF EXISTS "PrintingCrafters_maker_id_makers_id_fk";

ALTER TABLE public."PrintingCrafters"
	ADD CONSTRAINT "PrintingCrafters_maker_id_makers_id_fk"
	FOREIGN KEY (maker_id) REFERENCES public.makers(id) ON DELETE CASCADE;

ALTER TABLE public.makers ENABLE ROW LEVEL SECURITY;

CREATE POLICY makers_select_authenticated ON public.makers
	FOR SELECT TO authenticated
	USING (true);

CREATE POLICY makers_insert_own ON public.makers
	FOR INSERT TO authenticated
	WITH CHECK (id = auth.uid());

CREATE POLICY makers_update_own_pending ON public.makers
	FOR UPDATE TO authenticated
	USING (id = auth.uid() AND approved_state = 'pending')
	WITH CHECK (id = auth.uid() AND approved_state = 'pending');
