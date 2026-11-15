import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { maker } = await parent();
	const { session } = await locals.safeGetSession();

	// Approved makers without the printing capability get an explanation instead of a 403.
	if (!maker.capabilities?.includes('printing_3d')) {
		return {
			hasPrintingCapability: false,
			printingApproved: false,
			makerName: maker.display_name,
			session: session ? { data: { user: session.user } } : null
		};
	}

	const { data: crafter } = await locals.supabaseAdmin
		.from('PrintingCrafters')
		.select('approved_state, name')
		.eq('maker_id', maker.id)
		.maybeSingle();

	// Browser supabase comes from root +layout.ts — do not return locals.supabase (server client).
	return {
		hasPrintingCapability: true,
		printingApproved: crafter?.approved_state === 'approved',
		makerName: crafter?.name ?? maker.display_name,
		session: session ? { data: { user: session.user } } : null
	};
};
