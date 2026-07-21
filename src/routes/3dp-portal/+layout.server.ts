import { redirect } from '@sveltejs/kit';
import { getConstant } from '$lib/client/catalogApi';
import { isPrintRequestDetailPath } from '$lib/portal/printRequestPaths';
import type { LayoutServerLoad } from './$types';

const DEFAULT_FILTYPES = ['PLA', 'ABS', 'ASA', 'PETG', 'TPU', 'NYLON'];

export const load: LayoutServerLoad = async (event) => {
	const { session } = await event.locals.getLayoutSession();
	if (!session && event.url.pathname !== '/3dp-portal' && !isPrintRequestDetailPath(event.url.pathname)) {
		return redirect(303, '/3dp-portal');
	}

	const result = await getConstant(event.fetch, 'FILTYPES');
	const rawTypes = result.ok ? result.data.value : null;

	return {
		filtypes: Array.isArray(rawTypes)
			? rawTypes.filter((value): value is string => typeof value === 'string')
			: DEFAULT_FILTYPES
	};
};
