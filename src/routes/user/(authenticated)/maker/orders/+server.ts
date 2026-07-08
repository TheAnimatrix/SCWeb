import { json } from '@sveltejs/kit';

export const GET = async ({ url, locals: { supabase, supabaseAdmin } }) => {
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

	const { data, error } = await supabaseAdmin
		.from('printrequests')
		.select('id, created_at, model, request_stage, model_data, user_id')
		.eq('creator_id', userId)
		.order('created_at', { ascending: false })
		.range(from, to);

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	const orders = data ?? [];
	const requestUserIds = [
		...new Set(orders.map((order) => order.user_id).filter((id): id is string => Boolean(id)))
	];

	let usernames: Record<string, string | null> = {};
	if (requestUserIds.length > 0) {
		const { data: users } = await supabaseAdmin
			.from('users')
			.select('id, username')
			.in('id', requestUserIds);

		if (users) {
			usernames = Object.fromEntries(users.map((user) => [user.id, user.username]));
		}
	}

	const ordersWithUsernames = orders.map((order) => ({
		...order,
		username: usernames[order.user_id] ?? null
	}));

	return json({ orders: ordersWithUsernames, page, pageSize });
};
