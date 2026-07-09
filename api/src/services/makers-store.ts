import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import type { AvailableMaker } from '../contracts/makers.js';
import type { Database } from '../db/index.js';
import { creatorReviews } from '../db/schema/creatorReviews.js';
import { creatorStats } from '../db/schema/creatorStats.js';
import { makers } from '../db/schema/makers.js';
import { printingCrafters } from '../db/schema/printingCrafters.js';
import { userFilament } from '../db/schema/userFilament.js';
import { users } from '../db/schema/users.js';

export type MakersStore = ReturnType<typeof createMakersStore>;

function groupFilamentsByMaker(
	rows: Array<{ ownerId: string; color: string | null; materialType: string }>
): Map<string, AvailableMaker['filaments']> {
	const grouped = new Map<string, AvailableMaker['filaments']>();

	for (const row of rows) {
		if (!row.color) continue;
		const current = grouped.get(row.ownerId) ?? [];
		current.push({
			color: row.color,
			material_type: row.materialType
		});
		grouped.set(row.ownerId, current);
	}

	return grouped;
}

function groupReviewsByMaker(
	rows: Array<{
		makerId: string;
		rating: number;
		comment: string | null;
		createdAt: Date;
	}>
): Map<string, AvailableMaker['reviews']> {
	const grouped = new Map<string, AvailableMaker['reviews']>();

	for (const row of rows) {
		const current = grouped.get(row.makerId) ?? [];
		current.push({
			rating: row.rating,
			comment: row.comment,
			created_at: row.createdAt.toISOString()
		});
		grouped.set(row.makerId, current);
	}

	return grouped;
}

export function createMakersStore(db: Database) {
	return {
		async listAvailableMakers(): Promise<AvailableMaker[]> {
			return db.transaction(async (tx) => {
				const crafters = await tx
					.select({
						makerId: printingCrafters.makerId,
						crafterName: printingCrafters.name,
						approvedState: printingCrafters.approvedState,
						contactNumber: printingCrafters.contactNumber,
						email: printingCrafters.email,
						maxPrinterSize: printingCrafters.maxPrinterSize,
						numberOfPrinters: printingCrafters.numberOfPrinters,
						priceRank: printingCrafters.priceRank,
						deliveryRank: printingCrafters.deliveryRank,
						completedOrders: creatorStats.completedOrders,
						avgRating: creatorStats.avgRating,
						avgQuoteTime: creatorStats.avgQuoteTime,
						tier: users.tier
					})
					.from(printingCrafters)
					.innerJoin(makers, eq(makers.id, printingCrafters.makerId))
					.leftJoin(creatorStats, eq(creatorStats.makerId, printingCrafters.makerId))
					.leftJoin(users, eq(users.id, printingCrafters.makerId))
					.where(
						and(
							eq(makers.approvedState, 'approved'),
							eq(printingCrafters.approvedState, 'approved')
						)
					);

				if (crafters.length === 0) {
					return [];
				}

				const makerIds = crafters.map((crafter) => crafter.makerId);

				const filamentRows = await tx
					.select({
						ownerId: userFilament.ownerId,
						color: userFilament.color,
						materialType: userFilament.materialType
					})
					.from(userFilament)
					.where(
						and(inArray(userFilament.ownerId, makerIds), gt(userFilament.quantityKg, sql`0`))
					);

				const reviewRows = await tx
					.select({
						makerId: creatorReviews.makerId,
						rating: creatorReviews.rating,
						comment: creatorReviews.comment,
						createdAt: creatorReviews.createdAt
					})
					.from(creatorReviews)
					.where(inArray(creatorReviews.makerId, makerIds));

				const filamentsByMaker = groupFilamentsByMaker(filamentRows);
				const reviewsByMaker = groupReviewsByMaker(reviewRows);

				return crafters.map((crafter) => ({
					maker_id: crafter.makerId,
					crafter_name: crafter.crafterName ?? 'Maker',
					approved_state: crafter.approvedState ?? 'approved',
					avg_quote_time: crafter.avgQuoteTime,
					avg_rating: crafter.avgRating,
					completed_orders: crafter.completedOrders,
					contact_number: crafter.contactNumber,
					price_rank: crafter.priceRank ?? 3,
					delivery_rank: crafter.deliveryRank ?? 3,
					email: crafter.email,
					filaments: filamentsByMaker.get(crafter.makerId) ?? [],
					reviews: reviewsByMaker.get(crafter.makerId) ?? [],
					max_printer_size: crafter.maxPrinterSize,
					number_of_printers: crafter.numberOfPrinters,
					tier: crafter.tier
				}));
			});
		}
	};
}
