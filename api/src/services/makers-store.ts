import { and, desc, eq, gt, inArray, or, sql } from 'drizzle-orm';
import type { AvailableMaker } from '../contracts/makers.js';
import type { Database } from '../db/index.js';
import { creatorReviews } from '../db/schema/creatorReviews.js';
import { creatorStats } from '../db/schema/creatorStats.js';
import {
	listingReviews,
	makerApplications
} from '../db/schema/makerApplications.js';
import {
	makerCapabilities,
	type MakerCapabilityKey
} from '../db/schema/makerCapabilities.js';
import { makers } from '../db/schema/makers.js';
import { printingCrafters } from '../db/schema/printingCrafters.js';
import { products } from '../db/schema/products.js';
import { userFilament } from '../db/schema/userFilament.js';
import { users } from '../db/schema/users.js';
import { normalizeUsername, parseHandleParam } from '../lib/reserved-usernames.js';

export type MakersStore = ReturnType<typeof createMakersStore>;

function jsonEqual(a: unknown, b: unknown): boolean {
	return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Name, price, images, and type are the rare catalog fields that need staff re-review when live. */
function hasMaterialListingChange(
	existing: {
		name: string | null;
		price: { new: number; old: number } | null;
		type: string | null;
		images: { url: string }[] | null;
	},
	next: {
		name: string;
		price: { new: number; old: number };
		type: string;
		images: { url: string }[] | null | undefined;
	}
): boolean {
	if (existing.name !== next.name) return true;
	if (!jsonEqual(existing.price, next.price)) return true;
	if ((existing.type ?? 'product') !== next.type) return true;
	if (next.images !== undefined && !jsonEqual(existing.images ?? [], next.images)) return true;
	return false;
}

type DocEntry = { data: string; isMDUrl: boolean };

/** Product page docs layout: [0]=description, [1]=docs, [2]=costing, [3]=shipping */
function mergeDocumentation(
	existing: DocEntry[] | null | undefined,
	patch: {
		documentation?: DocEntry[];
		description?: string;
		docs?: string;
		costing?: string;
		shipping?: string;
	}
): DocEntry[] | undefined {
	if (patch.documentation) return patch.documentation;

	const hasNamed =
		patch.description !== undefined ||
		patch.docs !== undefined ||
		patch.costing !== undefined ||
		patch.shipping !== undefined;
	if (!hasNamed) return undefined;

	const base = existing ?? [];
	const slot = (i: number, value: string | undefined): DocEntry => ({
		data: value !== undefined ? value : (base[i]?.data ?? ''),
		isMDUrl: false
	});

	return [slot(0, patch.description), slot(1, patch.docs), slot(2, patch.costing), slot(3, patch.shipping)];
}

function normalizeTags(tags: string[] | undefined): { tag: string }[] | undefined {
	if (tags === undefined) return undefined;
	return tags.map((tag) => ({ tag }));
}

function listingDocFields(documentation: DocEntry[] | null | undefined) {
	const docs = documentation ?? [];
	return {
		description: docs[0]?.data ?? '',
		docs: docs[1]?.data ?? '',
		costing: docs[2]?.data ?? '',
		shipping: docs[3]?.data ?? ''
	};
}

export type ResolvedMaker = {
	id: string;
	display_name: string | null;
	approved_state: string;
	storefront_state: string;
	tagline: string | null;
	bio: string | null;
	avatar_url: string | null;
	banner_url: string | null;
	location: string | null;
	socials: Record<string, string> | null;
	published_at: string | null;
	username: string | null;
	tier: string | null;
	capabilities: MakerCapabilityKey[];
};

export type PublicStorefront = {
	maker_id: string;
	handle: string;
	display_name: string | null;
	tagline: string | null;
	bio: string | null;
	avatar_url: string | null;
	banner_url: string | null;
	location: string | null;
	socials: Record<string, string> | null;
	storefront_state: string;
	published_at: string | null;
	tier: string | null;
	capabilities: string[];
	products: Array<{
		id: string;
		name: string;
		price: { new: number; old: number } | null;
		stock: { count: number; status: string } | null;
		images: { url: string }[] | null;
		type: string | null;
		author: string | null;
	}>;
	printing: {
		max_printer_size: string | null;
		number_of_printers: number | null;
		filament_types: string[] | null;
	} | null;
};

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

function toIso(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	if (value instanceof Date) return value.toISOString();
	return value;
}

export function createMakersStore(db: Database) {
	async function loadCapabilities(makerId: string): Promise<MakerCapabilityKey[]> {
		const rows = await db
			.select({
				key: makerCapabilities.capabilityKey,
				state: makerCapabilities.state
			})
			.from(makerCapabilities)
			.where(
				and(eq(makerCapabilities.makerId, makerId), eq(makerCapabilities.state, 'approved'))
			);

		return rows
			.map((row) => row.key)
			.filter((key): key is MakerCapabilityKey =>
				['physical_goods', 'printing_3d', 'digital_goods'].includes(key)
			);
	}

	return {
		async resolveMaker(userId: string): Promise<ResolvedMaker | null> {
			const [row] = await db
				.select({
					maker: makers,
					username: users.username,
					tier: users.tier
				})
				.from(makers)
				.leftJoin(users, eq(users.id, makers.id))
				.where(eq(makers.id, userId))
				.limit(1);

			if (!row) return null;

			const capabilities = await loadCapabilities(userId);
			return {
				id: row.maker.id,
				display_name: row.maker.displayName,
				approved_state: row.maker.approvedState,
				storefront_state: row.maker.storefrontState,
				tagline: row.maker.tagline,
				bio: row.maker.bio,
				avatar_url: row.maker.avatarUrl,
				banner_url: row.maker.bannerUrl,
				location: row.maker.location,
				socials: (row.maker.socials as Record<string, string> | null) ?? null,
				published_at: toIso(row.maker.publishedAt),
				username: row.username,
				tier: row.tier,
				capabilities
			};
		},

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
						tier: users.tier,
						capabilityState: makerCapabilities.state
					})
					.from(printingCrafters)
					.innerJoin(makers, eq(makers.id, printingCrafters.makerId))
					.innerJoin(
						makerCapabilities,
						and(
							eq(makerCapabilities.makerId, printingCrafters.makerId),
							eq(makerCapabilities.capabilityKey, 'printing_3d')
						)
					)
					.leftJoin(creatorStats, eq(creatorStats.makerId, printingCrafters.makerId))
					.leftJoin(users, eq(users.id, printingCrafters.makerId))
					.where(
						and(
							eq(makers.approvedState, 'approved'),
							eq(printingCrafters.approvedState, 'approved'),
							eq(makerCapabilities.state, 'approved')
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
		},

		async submitApplication(input: {
			userId: string;
			displayName: string;
			bio?: string;
			city?: string;
			capabilities: MakerCapabilityKey[];
		}) {
			const existing = await this.resolveMaker(input.userId);
			if (existing?.approved_state === 'approved') {
				throw Object.assign(new Error('Already an approved maker'), { status: 409 });
			}

			const [pending] = await db
				.select({ id: makerApplications.id })
				.from(makerApplications)
				.where(
					and(
						eq(makerApplications.userId, input.userId),
						eq(makerApplications.status, 'pending')
					)
				)
				.limit(1);

			if (pending) {
				throw Object.assign(new Error('Application already pending'), { status: 409 });
			}

			const answers = {
				display_name: input.displayName,
				bio: input.bio ?? null,
				city: input.city ?? null
			};

			try {
				return await db.transaction(async (tx) => {
					await tx
						.insert(makers)
						.values({
							id: input.userId,
							displayName: input.displayName,
							approvedState: 'pending',
							application: null,
							bio: input.bio ?? null,
							location: input.city ?? null,
							storefrontState: 'draft',
							updatedAt: new Date()
						})
						.onConflictDoUpdate({
							target: makers.id,
							set: {
								displayName: input.displayName,
								application: null,
								bio: input.bio ?? null,
								location: input.city ?? null,
								approvedState: 'pending',
								updatedAt: new Date()
							}
						});

					for (const key of input.capabilities) {
						await tx
							.insert(makerCapabilities)
							.values({
								makerId: input.userId,
								capabilityKey: key,
								state: 'requested',
								updatedAt: new Date()
							})
							.onConflictDoUpdate({
								target: [makerCapabilities.makerId, makerCapabilities.capabilityKey],
								set: {
									state: 'requested',
									updatedAt: new Date()
								}
							});
					}

					const [application] = await tx
						.insert(makerApplications)
						.values({
							userId: input.userId,
							answers,
							requestedCapabilities: input.capabilities,
							status: 'pending'
						})
						.returning();

					return application;
				});
			} catch (error) {
				const code = (error as { code?: string }).code;
				if (code === '23505') {
					throw Object.assign(new Error('Application already pending'), { status: 409 });
				}
				throw error;
			}
		},

		async listPendingApplications() {
			const rows = await db
				.select({
					application: makerApplications,
					username: users.username,
					displayName: makers.displayName
				})
				.from(makerApplications)
				.leftJoin(users, eq(users.id, makerApplications.userId))
				.leftJoin(makers, eq(makers.id, makerApplications.userId))
				.where(eq(makerApplications.status, 'pending'))
				.orderBy(desc(makerApplications.createdAt));

			return rows.map((row) => ({
				id: row.application.id,
				user_id: row.application.userId,
				username: row.username,
				display_name: row.displayName,
				answers: row.application.answers,
				requested_capabilities: row.application.requestedCapabilities ?? [],
				status: row.application.status,
				created_at: toIso(row.application.createdAt)
			}));
		},

		async reviewApplication(input: {
			applicationId: string;
			reviewerId: string;
			decision: 'approved' | 'rejected';
			notes?: string;
		}) {
			return db.transaction(async (tx) => {
				const [application] = await tx
					.select()
					.from(makerApplications)
					.where(eq(makerApplications.id, input.applicationId))
					.limit(1);

				if (!application || application.status !== 'pending') {
					throw Object.assign(new Error('Application not found or not pending'), {
						status: 404
					});
				}

				await tx
					.update(makerApplications)
					.set({
						status: input.decision,
						reviewerId: input.reviewerId,
						reviewNotes: input.notes ?? null,
						reviewedAt: new Date(),
						updatedAt: new Date()
					})
					.where(eq(makerApplications.id, input.applicationId));

				const [makerRow] = await tx
					.select({ approvedState: makers.approvedState })
					.from(makers)
					.where(eq(makers.id, application.userId))
					.limit(1);

				if (input.decision === 'approved') {
					await tx
						.update(makers)
						.set({
							approvedState: 'approved',
							approvedAt: new Date(),
							application: null,
							updatedAt: new Date()
						})
						.where(eq(makers.id, application.userId));
				} else if (makerRow?.approvedState === 'pending') {
					// Never demote an already-approved maker when rejecting a duplicate/stale app.
					await tx
						.update(makers)
						.set({
							approvedState: 'rejected',
							application: null,
							updatedAt: new Date()
						})
						.where(eq(makers.id, application.userId));
				} else {
					await tx
						.update(makers)
						.set({
							application: null,
							updatedAt: new Date()
						})
						.where(eq(makers.id, application.userId));
				}

				if (input.decision === 'approved') {
					const caps = (application.requestedCapabilities ?? []) as string[];
					for (const key of caps) {
						await tx
							.insert(makerCapabilities)
							.values({
								makerId: application.userId,
								capabilityKey: key,
								state: 'approved',
								grantedAt: new Date(),
								updatedAt: new Date()
							})
							.onConflictDoUpdate({
								target: [makerCapabilities.makerId, makerCapabilities.capabilityKey],
								set: {
									state: 'approved',
									grantedAt: new Date(),
									updatedAt: new Date()
								}
							});
					}

					if (caps.includes('printing_3d')) {
						const answers = application.answers as {
							display_name?: string;
							city?: string;
						};
						await tx
							.insert(printingCrafters)
							.values({
								makerId: application.userId,
								approvedState: 'approved',
								name: answers.display_name ?? null
							})
							.onConflictDoUpdate({
								target: printingCrafters.makerId,
								set: {
									approvedState: 'approved',
									name: answers.display_name ?? null
								}
							});
					}
				}

				return { ok: true as const };
			});
		},

		async updateStorefront(
			makerId: string,
			patch: {
				display_name?: string | null;
				tagline?: string | null;
				bio?: string | null;
				avatar_url?: string | null;
				banner_url?: string | null;
				location?: string | null;
				socials?: Record<string, string> | null;
				storefront_state?: 'draft' | 'live' | 'paused';
			}
		) {
			const updates: Partial<typeof makers.$inferInsert> = {
				updatedAt: new Date()
			};
			if (patch.display_name !== undefined) updates.displayName = patch.display_name;
			if (patch.tagline !== undefined) updates.tagline = patch.tagline;
			if (patch.bio !== undefined) updates.bio = patch.bio;
			if (patch.avatar_url !== undefined) updates.avatarUrl = patch.avatar_url;
			if (patch.banner_url !== undefined) updates.bannerUrl = patch.banner_url;
			if (patch.location !== undefined) updates.location = patch.location;
			if (patch.socials !== undefined) updates.socials = patch.socials;
			if (patch.storefront_state !== undefined) {
				updates.storefrontState = patch.storefront_state;
				if (patch.storefront_state === 'live') {
					updates.publishedAt = new Date();
				}
			}

			await db.update(makers).set(updates).where(eq(makers.id, makerId));
			return this.resolveMaker(makerId);
		},

		async listMakerListings(makerId: string) {
			const rows = await db
				.select()
				.from(products)
				.where(or(eq(products.makerId, makerId), eq(products.uid, makerId)))
				.orderBy(desc(products.createdAt));

			return rows.map((row) => {
				const docFields = listingDocFields(row.documentation);
				return {
					id: row.id,
					name: row.name,
					price: row.price,
					stock: row.stock,
					images: row.images,
					type: row.type,
					tags: (row.tags ?? []).map((t) => t.tag),
					guarantee: row.guarantee,
					documentation: row.documentation,
					...docFields,
					faq: row.faq,
					listing_state: row.listingState,
					created_at: row.createdAt
				};
			});
		},

		async upsertListing(input: {
			makerId: string;
			username: string | null;
			productId?: string;
			name: string;
			priceNew: number;
			priceOld?: number;
			stockCount: number;
			stockStatus?: string;
			type?: string;
			images?: { url: string }[];
			tags?: string[];
			guarantee?: string | null;
			description?: string;
			docs?: string;
			costing?: string;
			shipping?: string;
			documentation?: { data: string; isMDUrl: boolean }[];
			faq?: { question: string; answer: string }[];
			submitForReview?: boolean;
		}) {
			const stock = {
				count: input.stockCount,
				status: input.stockStatus ?? (input.stockCount > 0 ? 'in-stock' : 'out-of-stock')
			};
			const price = {
				new: input.priceNew,
				old: input.priceOld !== undefined ? input.priceOld : input.priceNew
			};
			const nextTags = normalizeTags(input.tags);

			if (input.productId) {
				return db.transaction(async (tx) => {
					const [existing] = await tx
						.select()
						.from(products)
						.where(eq(products.id, input.productId!))
						.for('update')
						.limit(1);
					if (!existing || (existing.makerId !== input.makerId && existing.uid !== input.makerId)) {
						throw Object.assign(new Error('Listing not found'), { status: 404 });
					}

					const nextType = input.type ?? existing.type ?? 'product';
					const nextImages = input.images ?? existing.images;
					const nextDocumentation = mergeDocumentation(existing.documentation, input);
					const materialChanged = hasMaterialListingChange(existing, {
						name: input.name,
						price,
						type: nextType,
						images: nextImages
					});

					let nextState = existing.listingState;
					let queuedReview = false;

					if (input.submitForReview) {
						nextState = 'pending_review';
						queuedReview = existing.listingState !== 'pending_review';
					} else if (['draft', 'rejected'].includes(existing.listingState)) {
						nextState = 'draft';
					} else if (
						['live', 'paused'].includes(existing.listingState) &&
						materialChanged
					) {
						// Rare cases: name / price / images / type need staff re-approval.
						nextState = 'pending_review';
						queuedReview = true;
					}
					// Soft fields (stock, tags, guarantee, documentation, faq) never force re-review.

					const [updated] = await tx
						.update(products)
						.set({
							name: input.name,
							price,
							stock,
							type: nextType,
							images: nextImages,
							tags: nextTags !== undefined ? nextTags : existing.tags,
							guarantee:
								input.guarantee !== undefined ? input.guarantee : existing.guarantee,
							documentation:
								nextDocumentation !== undefined
									? nextDocumentation
									: existing.documentation,
							faq: input.faq !== undefined ? input.faq : existing.faq,
							makerId: input.makerId,
							uid: input.makerId,
							author: input.username ?? existing.author,
							listingState: nextState
						})
						.where(eq(products.id, input.productId!))
						.returning();

					if (queuedReview) {
						await tx.insert(listingReviews).values({
							productId: updated.id,
							makerId: input.makerId,
							fromState: existing.listingState,
							toState: 'pending_review',
							snapshot: {
								name: input.name,
								price,
								stock,
								material_changed: materialChanged
							}
						});
					}

					return updated;
				});
			}

			return db.transaction(async (tx) => {
				const listingState = input.submitForReview ? 'pending_review' : 'draft';
				const documentation =
					mergeDocumentation([], input) ?? [
						{ data: '', isMDUrl: false },
						{ data: '', isMDUrl: false },
						{ data: '', isMDUrl: false },
						{ data: '', isMDUrl: false }
					];
				const [created] = await tx
					.insert(products)
					.values({
						name: input.name,
						price,
						stock,
						type: input.type ?? 'product',
						images: input.images ?? [],
						tags: nextTags ?? [],
						guarantee: input.guarantee ?? null,
						documentation,
						faq: input.faq ?? [],
						makerId: input.makerId,
						uid: input.makerId,
						author: input.username,
						listingState
					})
					.returning();

				if (input.submitForReview) {
					await tx.insert(listingReviews).values({
						productId: created.id,
						makerId: input.makerId,
						fromState: null,
						toState: 'pending_review',
						snapshot: { name: input.name, price, stock }
					});
				}

				return created;
			});
		},

		async setListingStock(makerId: string, productId: string, stockCount: number) {
			const [existing] = await db
				.select()
				.from(products)
				.where(eq(products.id, productId))
				.limit(1);
			if (!existing || (existing.makerId !== makerId && existing.uid !== makerId)) {
				throw Object.assign(new Error('Listing not found'), { status: 404 });
			}

			const stock = {
				count: stockCount,
				status: stockCount > 0 ? 'in-stock' : 'out-of-stock'
			};
			const [updated] = await db
				.update(products)
				.set({ stock })
				.where(eq(products.id, productId))
				.returning();
			return updated;
		},

		async setListingDetails(
			makerId: string,
			productId: string,
			patch: {
				guarantee?: string | null;
				tags?: string[];
				description?: string;
				docs?: string;
				costing?: string;
				shipping?: string;
				documentation?: { data: string; isMDUrl: boolean }[];
				faq?: { question: string; answer: string }[];
			}
		) {
			const [existing] = await db
				.select()
				.from(products)
				.where(eq(products.id, productId))
				.limit(1);
			if (!existing || (existing.makerId !== makerId && existing.uid !== makerId)) {
				throw Object.assign(new Error('Listing not found'), { status: 404 });
			}
			if (existing.listingState === 'archived') {
				throw Object.assign(new Error('Archived listings cannot be edited'), { status: 409 });
			}

			const updates: Partial<typeof products.$inferInsert> = {};
			if (patch.guarantee !== undefined) updates.guarantee = patch.guarantee;
			if (patch.tags !== undefined) updates.tags = normalizeTags(patch.tags);
			const documentation = mergeDocumentation(existing.documentation, patch);
			if (documentation !== undefined) updates.documentation = documentation;
			if (patch.faq !== undefined) updates.faq = patch.faq;

			const [updated] = await db
				.update(products)
				.set(updates)
				.where(eq(products.id, productId))
				.returning();
			return updated;
		},

		/**
		 * Maker-driven visibility transitions (no staff review).
		 * live ↔ paused, live/paused → archived. Resume paused → live without re-review.
		 */
		async transitionMakerListingState(makerId: string, productId: string, toState: string) {
			const allowed: Record<string, string[]> = {
				live: ['paused', 'archived'],
				paused: ['live', 'archived']
			};

			return db.transaction(async (tx) => {
				const [existing] = await tx
					.select()
					.from(products)
					.where(eq(products.id, productId))
					.for('update')
					.limit(1);
				if (!existing || (existing.makerId !== makerId && existing.uid !== makerId)) {
					throw Object.assign(new Error('Listing not found'), { status: 404 });
				}

				const from = existing.listingState;
				if (!allowed[from]?.includes(toState)) {
					throw Object.assign(
						new Error(`Cannot move listing from ${from} to ${toState}`),
						{ status: 409 }
					);
				}

				const [updated] = await tx
					.update(products)
					.set({ listingState: toState })
					.where(eq(products.id, productId))
					.returning();

				await tx.insert(listingReviews).values({
					productId,
					makerId,
					fromState: from,
					toState,
					reviewerId: makerId,
					notes: 'maker_visibility',
					snapshot: { name: existing.name, price: existing.price, stock: existing.stock }
				});

				return updated;
			});
		},

		/**
		 * Staff listing decisions:
		 * - pending_review → live | rejected
		 * - live | paused → paused | archived | rejected | live (takedown / restore)
		 */
		async setListingState(
			productId: string,
			toState: string,
			reviewerId: string | null,
			notes?: string
		) {
			const staffAllowed: Record<string, string[]> = {
				pending_review: ['live', 'rejected'],
				live: ['paused', 'archived', 'rejected'],
				paused: ['live', 'archived', 'rejected']
			};

			return db.transaction(async (tx) => {
				const [existing] = await tx
					.select()
					.from(products)
					.where(eq(products.id, productId))
					.for('update')
					.limit(1);
				if (!existing) {
					throw Object.assign(new Error('Listing not found'), { status: 404 });
				}

				const from = existing.listingState;
				if (!staffAllowed[from]?.includes(toState)) {
					throw Object.assign(
						new Error(`Staff cannot move listing from ${from} to ${toState}`),
						{ status: 409 }
					);
				}

				const makerId = existing.makerId ?? existing.uid;
				if (!makerId) {
					throw Object.assign(new Error('Listing has no maker'), { status: 400 });
				}

				const [updated] = await tx
					.update(products)
					.set({ listingState: toState })
					.where(eq(products.id, productId))
					.returning();

				await tx.insert(listingReviews).values({
					productId,
					makerId,
					fromState: from,
					toState,
					reviewerId,
					notes: notes ?? null,
					snapshot: {
						name: existing.name,
						price: existing.price,
						stock: existing.stock
					}
				});

				return updated;
			});
		},

		async listPendingListings() {
			const rows = await db
				.select({
					product: products,
					username: users.username,
					displayName: makers.displayName
				})
				.from(products)
				.leftJoin(makers, eq(makers.id, products.makerId))
				.leftJoin(users, eq(users.id, products.makerId))
				.where(eq(products.listingState, 'pending_review'))
				.orderBy(desc(products.createdAt));

			return rows.map((row) => ({
				id: row.product.id,
				name: row.product.name,
				price: row.product.price,
				stock: row.product.stock,
				images: row.product.images,
				maker_id: row.product.makerId,
				username: row.username,
				display_name: row.displayName,
				listing_state: row.product.listingState,
				created_at: row.product.createdAt
			}));
		},

		async getPublicStorefront(handleParam: string): Promise<PublicStorefront | null> {
			const handle = normalizeUsername(parseHandleParam(handleParam));
			if (!handle) return null;

			const [row] = await db
				.select({
					maker: makers,
					username: users.username,
					tier: users.tier
				})
				.from(makers)
				.innerJoin(users, eq(users.id, makers.id))
				.where(
					and(
						sql`lower(${users.username}) = ${handle}`,
						eq(makers.approvedState, 'approved'),
						eq(makers.storefrontState, 'live')
					)
				)
				.limit(1);

			if (!row || !row.username) return null;

			const capabilities = await loadCapabilities(row.maker.id);
			const listingRows = await db
				.select()
				.from(products)
				.where(
					and(
						or(eq(products.makerId, row.maker.id), eq(products.uid, row.maker.id)),
						eq(products.listingState, 'live')
					)
				)
				.orderBy(desc(products.createdAt));

			let printing: PublicStorefront['printing'] = null;
			if (capabilities.includes('printing_3d')) {
				const [pc] = await db
					.select()
					.from(printingCrafters)
					.where(eq(printingCrafters.makerId, row.maker.id))
					.limit(1);
				if (pc) {
					printing = {
						max_printer_size: pc.maxPrinterSize,
						number_of_printers: pc.numberOfPrinters,
						filament_types: pc.filamentTypes
					};
				}
			}

			return {
				maker_id: row.maker.id,
				handle: row.username,
				display_name: row.maker.displayName,
				tagline: row.maker.tagline,
				bio: row.maker.bio,
				avatar_url: row.maker.avatarUrl,
				banner_url: row.maker.bannerUrl,
				location: row.maker.location,
				socials: (row.maker.socials as Record<string, string> | null) ?? null,
				storefront_state: row.maker.storefrontState,
				published_at: toIso(row.maker.publishedAt),
				tier: row.tier,
				capabilities,
				products: listingRows.map((p) => ({
					id: p.id,
					name: p.name ?? '',
					price: p.price,
					stock: p.stock,
					images: p.images,
					type: p.type,
					author: p.author
				})),
				printing
			};
		},

		async listLiveStorefrontHandles(): Promise<Array<{ handle: string; published_at: string | null }>> {
			const rows = await db
				.select({
					username: users.username,
					publishedAt: makers.publishedAt
				})
				.from(makers)
				.innerJoin(users, eq(users.id, makers.id))
				.where(and(eq(makers.approvedState, 'approved'), eq(makers.storefrontState, 'live')));

			return rows
				.filter((row): row is { username: string; publishedAt: Date | null } => Boolean(row.username))
				.map((row) => ({
					handle: row.username,
					published_at: toIso(row.publishedAt)
				}));
		}
	};
}
