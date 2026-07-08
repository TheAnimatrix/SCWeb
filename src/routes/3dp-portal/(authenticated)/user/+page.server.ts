import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, supabaseAdmin } }) => {
	// Get current user
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();
	if (userError || !user) {
		return { printRequests: [] };
	}

	// Fetch print requests for this user, including maker info
	const { data: printRequests, error: prError } = await supabaseAdmin
		.from('printrequests')
		.select('*')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false });

	const requests = printRequests ?? [];
	const creatorIds = [
		...new Set(requests.map((r) => r.creator_id).filter((id): id is string => id != null))
	];
	let makerNames: Record<string, string> = {};

	if (creatorIds.length > 0) {
		const { data: makers } = await supabaseAdmin
			.from('PrintingCrafters')
			.select('maker_id, name')
			.in('maker_id', creatorIds);

		if (makers) {
			makerNames = Object.fromEntries(makers.map((m) => [m.maker_id, m.name ?? '']));
		}
	}

	return {
		printRequests: requests,
		makerNames,
		error: prError?.message ?? null
	};
};
