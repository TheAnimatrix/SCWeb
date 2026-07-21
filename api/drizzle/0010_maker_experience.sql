-- Maker experience foundation: capabilities, storefront fields, listing states, reviews.

-- ---------------------------------------------------------------------------
-- Expand makers with storefront personalization
-- ---------------------------------------------------------------------------
ALTER TABLE public.makers
	ADD COLUMN IF NOT EXISTS tagline text,
	ADD COLUMN IF NOT EXISTS bio text,
	ADD COLUMN IF NOT EXISTS avatar_url text,
	ADD COLUMN IF NOT EXISTS banner_url text,
	ADD COLUMN IF NOT EXISTS location text,
	ADD COLUMN IF NOT EXISTS socials jsonb,
	ADD COLUMN IF NOT EXISTS storefront_state text NOT NULL DEFAULT 'draft',
	ADD COLUMN IF NOT EXISTS published_at timestamptz;

DO $$ BEGIN
	ALTER TABLE public.makers
		ADD CONSTRAINT makers_storefront_state_check
		CHECK (storefront_state IN ('draft', 'live', 'paused', 'suspended'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- maker_capabilities (unified capability model)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maker_capabilities (
	maker_id uuid NOT NULL REFERENCES public.makers(id) ON DELETE CASCADE,
	capability_key text NOT NULL,
	state text NOT NULL DEFAULT 'requested'
		CHECK (state IN ('requested', 'approved', 'revoked', 'suspended')),
	config jsonb,
	granted_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (maker_id, capability_key),
	CONSTRAINT maker_capabilities_key_check
		CHECK (capability_key IN ('physical_goods', 'printing_3d', 'digital_goods'))
);

CREATE INDEX IF NOT EXISTS maker_capabilities_key_state_idx
	ON public.maker_capabilities (capability_key, state);

-- Backfill printing_3d from PrintingCrafters (shim dual-read source of truth for 3DP profile).
INSERT INTO public.maker_capabilities (maker_id, capability_key, state, granted_at, created_at, updated_at)
SELECT
	pc.maker_id,
	'printing_3d',
	CASE
		WHEN pc.approved_state = 'approved' THEN 'approved'
		WHEN pc.approved_state = 'rejected' THEN 'revoked'
		ELSE 'requested'
	END,
	CASE WHEN pc.approved_state = 'approved' THEN COALESCE(pc.created_at, now()) ELSE NULL END,
	COALESCE(pc.created_at, now()),
	now()
FROM public."PrintingCrafters" pc
ON CONFLICT (maker_id, capability_key) DO UPDATE SET
	state = EXCLUDED.state,
	granted_at = COALESCE(EXCLUDED.granted_at, maker_capabilities.granted_at),
	updated_at = now();

-- Backfill physical_goods for makers who already have product listings.
INSERT INTO public.maker_capabilities (maker_id, capability_key, state, granted_at, created_at, updated_at)
SELECT DISTINCT
	m.id,
	'physical_goods',
	CASE WHEN m.approved_state = 'approved' THEN 'approved' ELSE 'requested' END,
	CASE WHEN m.approved_state = 'approved' THEN COALESCE(m.approved_at, now()) ELSE NULL END,
	m.created_at,
	now()
FROM public.makers m
INNER JOIN public.products p ON p.uid = m.id
ON CONFLICT (maker_id, capability_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- products.maker_id + listing_state
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
	ADD COLUMN IF NOT EXISTS maker_id uuid,
	ADD COLUMN IF NOT EXISTS listing_state text;

-- Grandfather existing rows as live; new inserts default to draft (approval required).
UPDATE public.products
SET listing_state = 'live'
WHERE listing_state IS NULL;

ALTER TABLE public.products
	ALTER COLUMN listing_state SET DEFAULT 'draft';

ALTER TABLE public.products
	ALTER COLUMN listing_state SET NOT NULL;

DO $$ BEGIN
	ALTER TABLE public.products
		ADD CONSTRAINT products_listing_state_check
		CHECK (listing_state IN ('draft', 'pending_review', 'live', 'paused', 'rejected', 'archived'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only backfill maker_id when a makers row exists (orphaned uids stay null).
UPDATE public.products p
SET maker_id = p.uid
WHERE p.maker_id IS NULL
	AND p.uid IS NOT NULL
	AND EXISTS (SELECT 1 FROM public.makers m WHERE m.id = p.uid);

UPDATE public.products p
SET maker_id = NULL
WHERE p.maker_id IS NOT NULL
	AND NOT EXISTS (SELECT 1 FROM public.makers m WHERE m.id = p.maker_id);

DO $$ BEGIN
	ALTER TABLE public.products
		ADD CONSTRAINT products_maker_id_makers_id_fk
		FOREIGN KEY (maker_id) REFERENCES public.makers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS products_maker_id_listing_state_idx
	ON public.products (maker_id, listing_state);

-- Grandfather existing catalog as live; makers with products get live storefront.
UPDATE public.makers m
SET storefront_state = 'live',
	published_at = COALESCE(m.published_at, m.approved_at, now())
WHERE m.approved_state = 'approved'
	AND EXISTS (SELECT 1 FROM public.products p WHERE p.maker_id = m.id OR p.uid = m.id);

-- ---------------------------------------------------------------------------
-- maker_applications (append-friendly application trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maker_applications (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
	version integer NOT NULL DEFAULT 1,
	answers jsonb NOT NULL DEFAULT '{}'::jsonb,
	requested_capabilities text[] NOT NULL DEFAULT '{}',
	status text NOT NULL DEFAULT 'pending'
		CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
	reviewer_id uuid REFERENCES public.users(id),
	review_notes text,
	reviewed_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maker_applications_status_idx
	ON public.maker_applications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS maker_applications_user_id_idx
	ON public.maker_applications (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- listing_reviews (append-only review decisions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_reviews (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
	maker_id uuid NOT NULL REFERENCES public.makers(id) ON DELETE CASCADE,
	from_state text,
	to_state text NOT NULL,
	reviewer_id uuid REFERENCES public.users(id),
	notes text,
	snapshot jsonb,
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_reviews_product_id_idx
	ON public.listing_reviews (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS listing_reviews_pending_idx
	ON public.listing_reviews (to_state, created_at DESC);

-- ---------------------------------------------------------------------------
-- Public storefront view (never exposes application jsonb)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_public_storefronts AS
SELECT
	m.id AS maker_id,
	u.username AS handle,
	m.display_name,
	m.tagline,
	m.bio,
	m.avatar_url,
	m.banner_url,
	m.location,
	m.socials,
	m.storefront_state,
	m.published_at,
	m.approved_state,
	u.tier,
	COALESCE(
		(
			SELECT array_agg(mc.capability_key ORDER BY mc.capability_key)
			FROM public.maker_capabilities mc
			WHERE mc.maker_id = m.id AND mc.state = 'approved'
		),
		'{}'::text[]
	) AS capabilities
FROM public.makers m
INNER JOIN public.users u ON u.id = m.id
WHERE m.approved_state = 'approved'
	AND m.storefront_state = 'live';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.maker_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maker_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maker_capabilities_select_own ON public.maker_capabilities;
CREATE POLICY maker_capabilities_select_own ON public.maker_capabilities
	FOR SELECT TO authenticated
	USING (maker_id = auth.uid() OR state = 'approved');

DROP POLICY IF EXISTS maker_applications_select_own ON public.maker_applications;
CREATE POLICY maker_applications_select_own ON public.maker_applications
	FOR SELECT TO authenticated
	USING (user_id = auth.uid());

DROP POLICY IF EXISTS maker_applications_insert_own ON public.maker_applications;
CREATE POLICY maker_applications_insert_own ON public.maker_applications
	FOR INSERT TO authenticated
	WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS listing_reviews_select_own ON public.listing_reviews;
CREATE POLICY listing_reviews_select_own ON public.listing_reviews
	FOR SELECT TO authenticated
	USING (maker_id = auth.uid());

-- Public can read live products (existing policies may already cover products).
-- Compatibility note: "PrintingCrafters" remains the 3DP profile shim table;
-- gate access via maker_capabilities.printing_3d while dual-reading profile fields.
