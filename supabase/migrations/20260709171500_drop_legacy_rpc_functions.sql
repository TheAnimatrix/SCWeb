-- Remove RPCs replaced by Hono + Drizzle API routes.

ALTER TABLE public.products ALTER COLUMN author DROP DEFAULT;

DROP FUNCTION IF EXISTS public.check_username(text);
DROP FUNCTION IF EXISTS public.check_user_exists(text);
DROP FUNCTION IF EXISTS public.get_author_name(uuid);
DROP FUNCTION IF EXISTS public.get_cart_by_uid(text);
DROP FUNCTION IF EXISTS public.get_creator_full_profile();
DROP FUNCTION IF EXISTS public.update_cart_by_id(text, uuid, jsonb, text);
