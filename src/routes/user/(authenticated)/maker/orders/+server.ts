import { json } from '@sveltejs/kit';

export const GET = async ({ url, locals: { supabase, supabaseServer } }) => {

  const { data: session } = await supabase.auth.getSession();
  if (!session || !session.session?.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.session.user.id;


  // Pagination params
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '50', 10), 50); // max 50
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Fetch printrequests with user info (username)
  const { data, error } = await supabaseServer
    .from('printrequests')
    .select('id, created_at, model, request_stage, quote, user_id, users: user_id (username)')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  // Map username into top-level for each order
  const orders = (data || []).map((order) => ({
    ...order,
    username: order.users?.username || null
  }));

  return json({ orders, page, pageSize });
};
