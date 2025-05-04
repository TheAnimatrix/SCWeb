import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_KEY } from '$env/static/public';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const supabrowserclient = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY);