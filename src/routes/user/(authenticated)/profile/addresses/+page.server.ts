import type { Address } from '$lib/types/product';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		return { addresses: [] as Address[], editing: [] as boolean[] };
	}

	const result = await supabase
		.from('addresses')
		.select('*')
		.eq('uid', user.id)
		.order('created_at', { ascending: false });
	const addresses: Address[] = [];
	const editing: boolean[] = [];

	if (result.data) {
		for (const row of result.data as unknown as Address[]) {
			addresses.push(row);
			editing.push(false);
		}
	}

	return {
		addresses,
		editing
	};
};
