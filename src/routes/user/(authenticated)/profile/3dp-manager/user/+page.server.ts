import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, supabaseServer } }) => {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return { printRequests: [] };
    }

    // Fetch print requests for this user, including maker info
    const { data: printRequests, error: prError } = await supabaseServer
        .from('printrequests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return {
        printRequests: printRequests ?? [],
        error: prError?.message ?? null
    };
}; 