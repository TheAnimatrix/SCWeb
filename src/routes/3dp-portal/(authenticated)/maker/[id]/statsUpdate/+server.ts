import type { RequestHandler } from '@sveltejs/kit';
import { createLogger } from '$lib/server/logger';
import { parsePrintModelData } from '$lib/types/printRequest';

// POST /3dp-portal/(authenticated)/maker/[id]/statsUpdate
/**
 * Updates statistics for a maker based on their completed print requests
 *
 * This endpoint:
 * 1. Verifies user authentication
 * 2. Fetches all print requests for the specified maker
 * 3. Calculates key statistics:
 *    - Number of completed orders
 *    - Average quote response time
 *    - Materials used across all prints
 *    - Average rating from customer reviews
 * 4. Updates the CreatorStats table with the latest metrics
 *
 * @param {Object} params - URL parameters containing maker ID
 * @param {Object} locals - Server locals containing Supabase instances
 * @returns {Response} JSON response with updated statistics or error
 */
export const POST: RequestHandler = async ({ params, locals, route }) => {
	const { id: maker_id } = params;
	const supabase = locals.supabaseAdmin;
	const log = createLogger({
		requestId: locals.requestId,
		route: route.id ?? undefined,
		clientId: locals.clientId
	});

	const { session } = await locals.safeGetSession();
	if (!session?.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	if (session.user.id !== maker_id) {
		return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
	}

	if (!maker_id) {
		log.error('maker.stats_update.missing_maker_id');
		return new Response(JSON.stringify({ error: 'Missing maker id' }), { status: 400 });
	}

	// 1. Fetch all completed printrequests for this maker
	const { data: printRequests, error: prError } = await supabase
		.from('printrequests')
		.select('id, model_data, events, request_stage, created_at')
		.eq('creator_id', maker_id);

	if (prError) {
		log.error('maker.stats_update.print_requests_failed', { makerId: maker_id });
		return new Response(JSON.stringify({ error: prError.message }), { status: 500 });
	}

	// 2. Filter completed orders
	const completedPrints = (printRequests ?? []).filter((pr) => pr.request_stage === 'completed');
	const completed_orders = completedPrints.length;

	// 3. Calculate avg_quote_time (average time from created_at to first quoted event)
	let totalQuoteTime = 0;
	let quoteCount = 0;
	for (const pr of completedPrints) {
		if (!pr.events || !Array.isArray(pr.events)) continue;
		const firstQuote = pr.events.find(
			(e): e is { type?: string; timestamp?: string } =>
				typeof e === 'object' && e !== null && (e as { type?: string }).type === 'quoted'
		);
		if (firstQuote && pr.created_at) {
			const created = new Date(pr.created_at).getTime();
			const quoted = new Date(firstQuote.timestamp ?? '').getTime();
			if (!isNaN(created) && !isNaN(quoted)) {
				totalQuoteTime += quoted - created;
				quoteCount++;
			}
		}
	}
	const avg_quote_time = quoteCount > 0 ? Math.round(totalQuoteTime / quoteCount / 1000) : null;

	// 4. Aggregate materials_used from model_data
	const materialsMap: Record<string, number> = {};
	for (const pr of completedPrints) {
		const modelData = parsePrintModelData(pr.model_data);
		if (modelData.material) {
			const mat = modelData.material;
			materialsMap[mat] = (materialsMap[mat] || 0) + 1;
		}
	}
	const materials_used = materialsMap;

	// 5. Calculate avg_rating from CreatorReviews
	const { data: reviews, error: reviewError } = await supabase
		.from('CreatorReviews')
		.select('rating')
		.eq('maker_id', maker_id);

	if (reviewError) {
		log.error('maker.stats_update.reviews_failed', { makerId: maker_id });
		return new Response(JSON.stringify({ error: reviewError.message }), { status: 500 });
	}
	const ratings = (reviews ?? []).map((r) => r.rating).filter((r) => typeof r === 'number');
	const avg_rating =
		ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

	// 6. Upsert CreatorStats
	const { error: upsertError } = await supabase.from('CreatorStats').upsert({
		maker_id,
		completed_orders,
		avg_rating,
		avg_quote_time: avg_quote_time != null ? String(avg_quote_time) : null,
		materials_used
	});

	if (upsertError) {
		log.error('maker.stats_update.upsert_failed', { makerId: maker_id });
		return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 });
	}

	return new Response(
		JSON.stringify({
			maker_id,
			completed_orders,
			avg_rating,
			avg_quote_time,
			materials_used
		}),
		{ status: 200 }
	);
};
