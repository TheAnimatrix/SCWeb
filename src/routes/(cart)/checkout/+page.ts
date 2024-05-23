import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	return {
		userExists: event.data.userExists,
		addresses: event.data.addresses
	};
};
