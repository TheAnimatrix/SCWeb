import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { maker } = await parent();
	if (!maker.capabilities?.includes('printing_3d')) {
		throw error(403, '3D printing capability required');
	}

	const { session } = await locals.safeGetSession();
	const { data: crafter } = await locals.supabaseAdmin
		.from('PrintingCrafters')
		.select('approved_state, name')
		.eq('maker_id', maker.id)
		.maybeSingle();

	return {
		printingApproved: crafter?.approved_state === 'approved',
		makerName: crafter?.name ?? maker.display_name,
		session: session ? { data: { user: session.user } } : null,
		supabase: locals.supabase
	};
};
