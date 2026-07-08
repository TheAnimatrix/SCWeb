import { eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { creatorReviews } from '../db/schema/creatorReviews.js';
import { creatorStats } from '../db/schema/creatorStats.js';
import { printrequests } from '../db/schema/printrequests.js';

function parseModelMaterial(modelData: unknown): string | null {
	if (!modelData || typeof modelData !== 'object' || Array.isArray(modelData)) {
		return null;
	}
	const material = (modelData as Record<string, unknown>).material;
	return typeof material === 'string' && material.length > 0 ? material : null;
}

export async function recalculateCreatorStats(db: Database, makerId: string): Promise<void> {
	const printRequestRows = await db
		.select({
			modelData: printrequests.modelData,
			events: printrequests.events,
			requestStage: printrequests.requestStage,
			createdAt: printrequests.createdAt
		})
		.from(printrequests)
		.where(eq(printrequests.creatorId, makerId));

	const completedPrints = printRequestRows.filter((pr) => pr.requestStage === 'completed');
	const completed_orders = completedPrints.length;

	let totalQuoteTime = 0;
	let quoteCount = 0;
	for (const pr of completedPrints) {
		if (!pr.events || !Array.isArray(pr.events)) continue;
		const firstQuote = pr.events.find(
			(e): e is { type?: string; timestamp?: string } =>
				typeof e === 'object' && e !== null && (e as { type?: string }).type === 'quoted'
		);
		if (firstQuote && pr.createdAt) {
			const created = pr.createdAt.getTime();
			const quoted = new Date(firstQuote.timestamp ?? '').getTime();
			if (!Number.isNaN(created) && !Number.isNaN(quoted)) {
				totalQuoteTime += quoted - created;
				quoteCount++;
			}
		}
	}
	const avg_quote_time = quoteCount > 0 ? Math.round(totalQuoteTime / quoteCount / 1000) : null;

	const materialsMap: Record<string, number> = {};
	for (const pr of completedPrints) {
		const material = parseModelMaterial(pr.modelData);
		if (material) {
			materialsMap[material] = (materialsMap[material] || 0) + 1;
		}
	}
	const materials_used = materialsMap;

	const reviewRows = await db
		.select({ rating: creatorReviews.rating })
		.from(creatorReviews)
		.where(eq(creatorReviews.makerId, makerId));

	const ratings = reviewRows.map((r) => r.rating).filter((r) => typeof r === 'number');
	const avg_rating =
		ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

	await db
		.insert(creatorStats)
		.values({
			makerId,
			completedOrders: completed_orders,
			avgRating: avg_rating,
			avgQuoteTime: avg_quote_time != null ? String(avg_quote_time) : null,
			materialsUsed: materials_used
		})
		.onConflictDoUpdate({
			target: creatorStats.makerId,
			set: {
				completedOrders: completed_orders,
				avgRating: avg_rating,
				avgQuoteTime: avg_quote_time != null ? String(avg_quote_time) : null,
				materialsUsed: materials_used
			}
		});
}
