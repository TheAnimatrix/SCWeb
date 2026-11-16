import { getMyInterests } from '$lib/client/interestApi';
import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ fetch }) => {
	const result = await getMyInterests(fetch);
	return result.ok
		? { interests: result.data.interests, loadError: null }
		: { interests: [], loadError: result.error.message };
};
