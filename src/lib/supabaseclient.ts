import { createBrowserClient } from '@supabase/ssr';
const supakey = import.meta.env.VITE_SUPABASE_KEY;
const supaurl = import.meta.env.VITE_SUPABASE_URL;
export const supabrowserclient = createBrowserClient(supaurl, supakey);