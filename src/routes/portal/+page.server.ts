import { listMyListings } from '$lib/client/makersApi';
import type { PageServerLoad } from './$types';

type ListingSummary = {
	live: number;
	inReview: number;
	drafts: number;
	rejected: number;
	total: number;
};

export const load: PageServerLoad = async ({ parent, fetch }) => {
	const { maker } = await parent();
	if (!maker.capabilities?.includes('physical_goods')) {
		return { listingSummary: null as ListingSummary | null };
	}

	const result = await listMyListings(fetch);
	if (!result.ok) return { listingSummary: null as ListingSummary | null };

	const summary: ListingSummary = { live: 0, inReview: 0, drafts: 0, rejected: 0, total: 0 };
	for (const listing of result.data.listings) {
		const state = listing.listing_state;
		if (state === 'archived') continue;
		summary.total += 1;
		if (state === 'live') summary.live += 1;
		else if (state === 'pending_review') summary.inReview += 1;
		else if (state === 'draft') summary.drafts += 1;
		else if (state === 'rejected') summary.rejected += 1;
	}
	return { listingSummary: summary as ListingSummary | null };
};
