import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { maker } = await parent();
	return { maker };
};
