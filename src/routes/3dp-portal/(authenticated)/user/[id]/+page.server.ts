import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
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
    .eq('user_id', user.id)
    .single();

  if (prError || !printRequest) {
    //throw error
    throw error(404, {
      message: prError?.message ?? 'Not found'
    });
  }

  // Fetch maker info if assigned
  let maker = null;
  if (printRequest.creator_id) {
    const { data: makerData } = await supabaseServer
      .from('PrintingCrafters')
      .select('name, email, contact_number')
      .eq('maker_id', printRequest.creator_id)
      .single();
    maker = makerData;
  }

  return {
    printRequest,
    maker
  };
}; 