import { error } from '@sveltejs/kit';
import { parseHandleParam } from '$lib/utils/reservedUsernames';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	const handle = parseHandleParam(params.handle);
	const encoded = encodeURIComponent(handle.replace(/^@/, ''));

	// Called directly (not via makersApi) so a 404 can be told apart from an outage.
	let response: Response;
	try {
		response = await fetch(`/api/makers/storefront/${encoded}`);
	} catch (cause) {
		console.error('[makers] storefront load failed:', cause);
		error(503, 'Maker storefront unavailable');
	}

	if (response.status === 404 || response.status === 400) {
		error(404, 'Maker storefront not found');
	}
	if (!response.ok) {
		console.error('[makers] storefront load failed:', response.status);
		error(503, 'Maker storefront unavailable');
	}

	const body = (await response.json().catch(() => null)) as {
		storefront?: Record<string, unknown>;
	} | null;
	if (!body?.storefront) {
		error(503, 'Maker storefront unavailable');
	}

	const tab = url.searchParams.get('tab') === 'details' ? 'details' : 'store';
	return {
		storefront: body.storefront,
		tab
	};
};
