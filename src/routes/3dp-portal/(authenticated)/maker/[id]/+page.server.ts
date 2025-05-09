
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from '../$types';
export const load: PageServerLoad = async ({ params, depends, locals: { supabase, supabaseServer } }) => {
  depends('3dp-portal:printrequest');
  const { id } = params;
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { printRequest: null, error: 'Not authenticated' };
  }

  // Fetch the print request (ensure user owns it)
  const { data: printRequest, error: prError } = await supabaseServer
    .from('printrequests')
    .select('*')
    .eq('id', id)
    .eq('creator_id', user.id)
    .single();

  if (prError || !printRequest) {
    //throw error
    throw error(404, {
      message: prError?.message ?? 'Not found'
    });
  }

  //fetch username of user
  const { data: userData, error: userError2 } = await supabaseServer
    .from('users')
    .select('username')
    .eq('id', printRequest.user_id)
    .single();

  return {
    printRequest,
    username: userError2 ? 'The user' : userData?.username
  };
}; 