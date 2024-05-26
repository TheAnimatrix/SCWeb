import type { Address } from '$lib/types/product';
import type { PageLoad } from './$types';
export const ssr = false;

export const load: PageLoad = async ({parent}) => {
    const data = await parent();
	let addresses: Address[] = [];
	let editing: boolean[] = [];

	const result = await data.supabase_lt.from('addresses').select('*');
	if (result && result.data) {
		for (const r of result.data as Address[]) {
			addresses.push(r);
			editing.push(false);
		}
		addresses = [...addresses];
		editing = [...editing];
	}

	return {
		addresses,
		editing
	};
};
