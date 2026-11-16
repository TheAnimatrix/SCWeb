import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { CheckoutAddress } from '../contracts/address.js';
import { DELIVERY_FLAT_FEE } from '../contracts/cart.js';
import {
	INTEREST_STATUS,
	type AdminInterestCampaigns,
	type AdminInterestList,
	type CloseInterestBody,
	type InterestChangeResponse,
	type InterestNotifyResponse,
	type LaunchInterestBody,
	type ListingInterestInput,
	type MakerInterestSummary,
	type MakerListingInterest,
	type MyInterestResponse,
	type ProductInterest
} from '../contracts/interest.js';
import type { Database, DbExecutor } from '../db/index.js';
import { interestCampaigns, productInterests } from '../db/schema/interest.js';
import { makers } from '../db/schema/makers.js';
import { products } from '../db/schema/products.js';
import { users } from '../db/schema/users.js';
import { storeLog } from '../middleware/logging.js';
import { writeAudit } from './audit.js';
import { productHref } from './catalog-mappers.js';
import {
	renderInterestClosedEmail,
	renderInterestJoinedEmail,
	renderInterestLaunchedEmail
} from './email-templates/interest.js';
import type { RenderedEmail } from './mail.js';

/**
 * Interest checks (see contracts/interest.ts).
 *
 * Locking order, shared with listing edits, cart and checkout: the product row first, then the
 * campaign row. Joining takes a share lock on the campaign so a launch or close (which takes
 * an update lock) never misses someone who joined while it was running.
 */

export const INTEREST_LOCKED_MESSAGE =
	'People have already shown interest, so the target and shipping time are fixed. Write to support@selfcrafted.in to change them.';

/** Rule violations raised while saving a listing; the makers route turns them into `{ error, message }`. */
export class InterestRuleError extends Error {
	constructor(
		readonly code: 'interest_locked' | 'interest_not_allowed' | 'invalid_payload',
		readonly status: 400 | 409,
		message: string
	) {
		super(message);
		this.name = 'InterestRuleError';
	}
}

type Failure<E extends string> = {
	ok: false;
	status: 400 | 403 | 404 | 409;
	body: { error: E; message: string };
};
type Result<T, E extends string> = { ok: true; response: T } | Failure<E>;

function fail<E extends string>(
	status: Failure<E>['status'],
	error: E,
	message: string
): Failure<E> {
	return { ok: false, status, body: { error, message } };
}

function toIso(value: string | Date | null | undefined): string | null {
	if (value == null) return null;
	const time = new Date(value).getTime();
	return Number.isFinite(time) ? new Date(time).toISOString() : String(value);
}

function nowIso(): string {
	return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Helpers shared with the catalog, cart, checkout and makers stores
// ---------------------------------------------------------------------------

type Selectable = Pick<Database, 'select'>;

/**
 * One row per campaign with its live count of non-withdrawn interests. Join it on
 * `product_id` the same way review stats are joined.
 */
export function interestStatsSubquery(db: Selectable) {
	return db
		.select({
			productId: interestCampaigns.productId,
			status: interestCampaigns.status,
			targetCount: interestCampaigns.targetCount,
			shipsWithinDays: interestCampaigns.shipsWithinDays,
			note: interestCampaigns.note,
			launchedAt: interestCampaigns.launchedAt,
			closedAt: interestCampaigns.closedAt,
			interestedCount: sql<number>`count(${productInterests.id})::int`.as('interested_count')
		})
		.from(interestCampaigns)
		.leftJoin(
			productInterests,
			and(
				eq(productInterests.productId, interestCampaigns.productId),
				isNull(productInterests.withdrawnAt)
			)
		)
		.groupBy(interestCampaigns.productId)
		.as('interest_stats');
}

export type InterestStatsRow = {
	status: string | null;
	targetCount: number | null;
	shipsWithinDays: number | null;
	note: string | null;
	interestedCount: number | string | null;
};

/** Catalog `interest` field: null for an ordinary listing. */
export function productInterestFromStats(
	row: InterestStatsRow | null | undefined
): ProductInterest | null {
	if (!row || row.status == null || row.targetCount == null || row.shipsWithinDays == null) {
		return null;
	}
	return {
		status: row.status as ProductInterest['status'],
		targetCount: row.targetCount,
		interestedCount: Number(row.interestedCount ?? 0),
		shipsWithinDays: row.shipsWithinDays,
		note: row.note ?? null
	};
}

async function loadInterestStats(db: Selectable, productIds: string[]) {
	if (productIds.length === 0) return [];
	const stats = interestStatsSubquery(db);
	return db.select().from(stats).where(inArray(stats.productId, productIds));
}

/** Catalog `interest` for each of `productIds` that has a campaign. */
export async function loadProductInterests(
	db: Selectable,
	productIds: string[]
): Promise<Map<string, ProductInterest>> {
	const rows = await loadInterestStats(db, productIds);
	const map = new Map<string, ProductInterest>();
	for (const row of rows) {
		const interest = productInterestFromStats(row);
		if (interest) map.set(row.productId, interest);
	}
	return map;
}

/** Maker-portal `interest` for each of `productIds` that has a campaign. */
export async function loadMakerListingInterests(
	db: Selectable,
	productIds: string[]
): Promise<Map<string, MakerListingInterest>> {
	const rows = await loadInterestStats(db, productIds);
	return new Map(
		rows.map((row) => [
			row.productId,
			{
				status: row.status as MakerListingInterest['status'],
				target_count: row.targetCount,
				ships_within_days: row.shipsWithinDays,
				note: row.note ?? null,
				interested_count: Number(row.interestedCount ?? 0),
				launched_at: toIso(row.launchedAt),
				closed_at: toIso(row.closedAt)
			}
		])
	);
}

/**
 * Products that cannot be bought because their interest check is still open, or was closed
 * without launching. Cart and checkout treat these like a listing that is not live.
 */
export async function findUnbuyableInterestProductIds(
	db: Selectable,
	productIds: string[]
): Promise<Set<string>> {
	if (productIds.length === 0) return new Set();
	const rows = await db
		.select({ productId: interestCampaigns.productId })
		.from(interestCampaigns)
		.where(
			and(
				inArray(interestCampaigns.productId, productIds),
				inArray(interestCampaigns.status, [INTEREST_STATUS.OPEN, INTEREST_STATUS.CLOSED])
			)
		);
	return new Set(rows.map((row) => row.productId));
}

async function countActiveInterests(db: Selectable, productId: string): Promise<number> {
	const [row] = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(productInterests)
		.where(and(eq(productInterests.productId, productId), isNull(productInterests.withdrawnAt)));
	return Number(row?.value ?? 0);
}

/** States in which an ordinary listing may still become an interest check (never sold). */
const INTEREST_ENABLE_STATES = new Set(['draft', 'rejected', 'pending_review']);

function requireSettings(input: ListingInterestInput) {
	if (input.target_count == null || input.ships_within_days == null) {
		throw new InterestRuleError(
			'invalid_payload',
			400,
			'Enter how many people you need and how many days it ships within.'
		);
	}
	return {
		targetCount: input.target_count,
		shipsWithinDays: input.ships_within_days,
		note: input.note?.trim() ? input.note.trim() : null
	};
}

/** Validates `interest` on a new listing before the product row is inserted. */
export function validateNewListingInterest(input: ListingInterestInput | undefined) {
	if (!input?.enabled) return null;
	return requireSettings(input);
}

/** Creates the campaign for a listing that was just inserted. */
export async function createListingCampaign(
	tx: DbExecutor,
	productId: string,
	settings: NonNullable<ReturnType<typeof validateNewListingInterest>>
) {
	await tx.insert(interestCampaigns).values({ productId, ...settings });
}

/**
 * Applies `interest` from a listing update, inside the transaction that holds the product row
 * lock. Returns whether anything a buyer sees changed (the caller sends a live listing back
 * to review, like a price change).
 *
 * - `interest` omitted: no change.
 * - A launched or closed campaign is history and is left alone.
 * - Once someone has joined, the target and shipping time are fixed and the check cannot be
 *   turned off (409 `interest_locked`). The note can still change.
 * - Only a listing that has never been live (draft, rejected, pending review) can become one.
 */
export async function applyListingInterestUpdate(
	tx: DbExecutor,
	productId: string,
	listingState: string,
	input: ListingInterestInput | undefined
): Promise<{ changed: boolean }> {
	if (!input) return { changed: false };

	const [campaign] = await tx
		.select()
		.from(interestCampaigns)
		.where(eq(interestCampaigns.productId, productId))
		.for('update')
		.limit(1);

	if (campaign && campaign.status !== INTEREST_STATUS.OPEN) {
		return { changed: false };
	}

	if (!input.enabled) {
		if (!campaign) return { changed: false };
		if ((await countActiveInterests(tx, productId)) > 0) {
			throw new InterestRuleError('interest_locked', 409, INTEREST_LOCKED_MESSAGE);
		}
		await tx.delete(interestCampaigns).where(eq(interestCampaigns.productId, productId));
		return { changed: true };
	}

	const settings = requireSettings(input);
	const note = input.note === undefined ? (campaign?.note ?? null) : settings.note;

	if (!campaign) {
		if (!INTEREST_ENABLE_STATES.has(listingState)) {
			throw new InterestRuleError(
				'interest_not_allowed',
				409,
				'Only a listing that has not gone live yet can become an interest check.'
			);
		}
		await tx.insert(interestCampaigns).values({ productId, ...settings, note });
		return { changed: true };
	}

	const commitmentChanged =
		campaign.targetCount !== settings.targetCount ||
		campaign.shipsWithinDays !== settings.shipsWithinDays;
	if (commitmentChanged && (await countActiveInterests(tx, productId)) > 0) {
		throw new InterestRuleError('interest_locked', 409, INTEREST_LOCKED_MESSAGE);
	}
	if (!commitmentChanged && (campaign.note ?? null) === note) {
		return { changed: false };
	}

	await tx
		.update(interestCampaigns)
		.set({
			targetCount: settings.targetCount,
			shipsWithinDays: settings.shipsWithinDays,
			note,
			updatedAt: nowIso()
		})
		.where(eq(interestCampaigns.productId, productId));
	return { changed: true };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export type InterestStoreDeps = {
	siteUrl: string;
	/** Sends one e-mail and resolves only once it has been accepted for delivery. */
	deliver(to: string, email: RenderedEmail): Promise<void>;
};

export type BuyerInterestError =
	'product_not_found' | 'interest_closed' | 'own_listing' | 'invalid_payload';

export type MakerInterestError =
	'listing_not_found' | 'not_an_interest_listing' | 'interest_not_open' | 'listing_not_live';

export type InterestStore = ReturnType<typeof createInterestStore>;

export function createInterestStore(db: Database, deps: InterestStoreDeps) {
	function errorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}

	async function loadMakerName(
		executor: Selectable,
		product: { makerId: string | null; uid: string | null; author: string | null }
	): Promise<string> {
		const makerId = product.makerId ?? product.uid;
		if (makerId) {
			const [row] = await executor
				.select({ displayName: makers.displayName, username: users.username })
				.from(users)
				.leftJoin(makers, eq(makers.id, users.id))
				.where(eq(users.id, makerId))
				.limit(1);
			const name = row?.displayName?.trim() || row?.username?.trim();
			if (name) return name;
		}
		return product.author?.trim() || 'the maker';
	}

	function listingUrl(product: { id: string; name: string | null }): string {
		return `${deps.siteUrl}${productHref(product.name ?? '', product.id)}`;
	}

	async function loadOwnedListing(executor: DbExecutor, makerId: string, productId: string) {
		const [product] = await executor
			.select()
			.from(products)
			.where(
				and(
					eq(products.id, productId),
					or(eq(products.makerId, makerId), eq(products.uid, makerId))
				)
			)
			.limit(1);
		return product ?? null;
	}

	async function countPending(productId: string): Promise<number> {
		const [row] = await db
			.select({ value: sql<number>`count(*)::int` })
			.from(productInterests)
			.where(
				and(
					eq(productInterests.productId, productId),
					isNull(productInterests.withdrawnAt),
					isNull(productInterests.notifiedAt)
				)
			);
		return Number(row?.value ?? 0);
	}

	/**
	 * E-mails everyone on the list who has not been e-mailed yet, one at a time. Each person's
	 * row is locked while their e-mail is sent (SKIP LOCKED), so two concurrent calls never
	 * e-mail the same person, and `notified_at` is stamped only once the send succeeded.
	 */
	async function notifyPending(
		productId: string,
		kind: 'launched' | 'closed',
		email: RenderedEmail
	): Promise<{ notified: number; pending: number }> {
		const candidates = await db
			.select({ id: productInterests.id })
			.from(productInterests)
			.where(
				and(
					eq(productInterests.productId, productId),
					isNull(productInterests.withdrawnAt),
					isNull(productInterests.notifiedAt)
				)
			)
			.orderBy(asc(productInterests.createdAt));

		let notified = 0;
		for (const candidate of candidates) {
			try {
				const sent = await db.transaction(async (tx) => {
					const [row] = await tx
						.select({ id: productInterests.id, email: productInterests.email })
						.from(productInterests)
						.where(
							and(
								eq(productInterests.id, candidate.id),
								isNull(productInterests.withdrawnAt),
								isNull(productInterests.notifiedAt)
							)
						)
						.for('update', { skipLocked: true })
						.limit(1);
					if (!row || !row.email) return false;
					await deps.deliver(row.email, email);
					await tx
						.update(productInterests)
						.set({ notifiedAt: nowIso(), updatedAt: nowIso() })
						.where(eq(productInterests.id, row.id));
					return true;
				});
				if (sent) notified += 1;
			} catch (error) {
				storeLog('warn', 'interest.notify_failed', {
					productId,
					interestId: candidate.id,
					kind,
					error: errorMessage(error)
				});
			}
		}

		return { notified, pending: await countPending(productId) };
	}

	return {
		async getMyInterest(userId: string, productId: string): Promise<MyInterestResponse> {
			const [row] = await db
				.select({ createdAt: productInterests.createdAt })
				.from(productInterests)
				.where(
					and(
						eq(productInterests.productId, productId),
						eq(productInterests.userId, userId),
						isNull(productInterests.withdrawnAt)
					)
				)
				.limit(1);
			return { interested: Boolean(row), since: toIso(row?.createdAt) };
		},

		async showInterest(input: {
			userId: string;
			productId: string;
			address: CheckoutAddress;
			/** The account e-mail, snapshotted on the row. */
			email: string | null;
		}): Promise<Result<InterestChangeResponse, BuyerInterestError>> {
			const { userId, productId, address } = input;
			const email = input.email?.trim() ?? '';

			const outcome = await db.transaction(async (tx) => {
				const [product] = await tx
					.select()
					.from(products)
					.where(eq(products.id, productId))
					.limit(1);
				if (!product || product.listingState !== 'live') {
					return fail<BuyerInterestError>(404, 'product_not_found', 'Listing not found.');
				}
				if (product.uid === userId || product.makerId === userId) {
					return fail<BuyerInterestError>(
						409,
						'own_listing',
						"This is your own listing, so you can't add yourself."
					);
				}

				const [campaign] = await tx
					.select()
					.from(interestCampaigns)
					.where(eq(interestCampaigns.productId, productId))
					.for('share')
					.limit(1);
				if (!campaign || campaign.status !== INTEREST_STATUS.OPEN) {
					return fail<BuyerInterestError>(409, 'interest_closed', 'This interest check has ended.');
				}

				const values = {
					name: address.name,
					email,
					phone: address.phone,
					address
				};
				const inserted = await tx
					.insert(productInterests)
					.values({ productId, userId, ...values })
					.onConflictDoNothing({
						target: [productInterests.productId, productInterests.userId]
					})
					.returning({ id: productInterests.id });

				let joined = inserted.length > 0;
				if (!joined) {
					const [existing] = await tx
						.select({ withdrawnAt: productInterests.withdrawnAt })
						.from(productInterests)
						.where(
							and(eq(productInterests.productId, productId), eq(productInterests.userId, userId))
						)
						.for('update')
						.limit(1);
					const reviving = existing?.withdrawnAt != null;
					const now = nowIso();
					await tx
						.update(productInterests)
						.set({
							...values,
							updatedAt: now,
							...(reviving ? { withdrawnAt: null, notifiedAt: null, createdAt: now } : {})
						})
						.where(
							and(eq(productInterests.productId, productId), eq(productInterests.userId, userId))
						);
					joined = reviving;
				}

				const interestedCount = await countActiveInterests(tx, productId);
				return { ok: true as const, joined, interestedCount, product, campaign };
			});

			if (!outcome.ok) return outcome;

			if (outcome.joined && email) {
				const { product, campaign, interestedCount } = outcome;
				void (async () => {
					const makerName = await loadMakerName(db, product);
					await deps.deliver(
						email,
						renderInterestJoinedEmail({
							siteUrl: deps.siteUrl,
							productName: product.name ?? 'this listing',
							makerName,
							targetCount: campaign.targetCount,
							interestedCount,
							shipsWithinDays: campaign.shipsWithinDays,
							listingUrl: listingUrl(product)
						})
					);
				})().catch((error) => {
					storeLog('warn', 'interest.joined_email_failed', {
						productId,
						userId,
						error: errorMessage(error)
					});
				});
			}

			return {
				ok: true,
				response: { interested: true, interestedCount: outcome.interestedCount }
			};
		},

		async withdrawInterest(
			userId: string,
			productId: string
		): Promise<Result<InterestChangeResponse, BuyerInterestError>> {
			const [product] = await db
				.select({ id: products.id })
				.from(products)
				.where(eq(products.id, productId))
				.limit(1);
			if (!product) {
				return fail(404, 'product_not_found', 'Listing not found.');
			}
			const now = nowIso();
			await db
				.update(productInterests)
				.set({ withdrawnAt: now, updatedAt: now })
				.where(
					and(
						eq(productInterests.productId, productId),
						eq(productInterests.userId, userId),
						isNull(productInterests.withdrawnAt)
					)
				);
			return {
				ok: true,
				response: {
					interested: false,
					interestedCount: await countActiveInterests(db, productId)
				}
			};
		},

		async getMakerSummary(
			makerId: string,
			productId: string
		): Promise<Result<MakerInterestSummary, MakerInterestError>> {
			const product = await loadOwnedListing(db, makerId, productId);
			if (!product) return fail(404, 'listing_not_found', 'Listing not found.');

			const [campaign] = await db
				.select()
				.from(interestCampaigns)
				.where(eq(interestCampaigns.productId, productId))
				.limit(1);
			if (!campaign) {
				return fail(409, 'not_an_interest_listing', 'This listing is not an interest check.');
			}

			const active = and(
				eq(productInterests.productId, productId),
				isNull(productInterests.withdrawnAt)
			);
			const stateExpr = sql<string>`coalesce(nullif(trim(${productInterests.address}->>'state'), ''), 'Unknown')`;
			const cityExpr = sql<string>`coalesce(nullif(trim(${productInterests.address}->>'city'), ''), 'Unknown')`;

			// Counts only: no names, phone numbers, e-mail addresses or street addresses.
			const [totals, byState, byCity] = await Promise.all([
				db
					.select({
						interested: sql<number>`count(*)::int`,
						notified: sql<number>`count(${productInterests.notifiedAt})::int`
					})
					.from(productInterests)
					.where(active),
				db
					.select({ state: stateExpr, count: sql<number>`count(*)::int` })
					.from(productInterests)
					.where(active)
					.groupBy(stateExpr)
					.orderBy(desc(sql`count(*)`), asc(stateExpr)),
				db
					.select({ city: cityExpr, state: stateExpr, count: sql<number>`count(*)::int` })
					.from(productInterests)
					.where(active)
					.groupBy(cityExpr, stateExpr)
					.orderBy(desc(sql`count(*)`), asc(cityExpr))
			]);

			return {
				ok: true,
				response: {
					status: campaign.status as MakerInterestSummary['status'],
					targetCount: campaign.targetCount,
					shipsWithinDays: campaign.shipsWithinDays,
					interestedCount: Number(totals[0]?.interested ?? 0),
					notifiedCount: Number(totals[0]?.notified ?? 0),
					byState: byState.map((row) => ({ state: row.state, count: Number(row.count) })),
					byCity: byCity.map((row) => ({
						city: row.city,
						state: row.state,
						count: Number(row.count)
					}))
				}
			};
		},

		/**
		 * Launch: the listing becomes an ordinary one with `stock_count` units and everyone on the
		 * list is e-mailed. Calling it again only retries people who were not e-mailed.
		 */
		async launch(
			makerId: string,
			productId: string,
			body: LaunchInterestBody
		): Promise<Result<InterestNotifyResponse, MakerInterestError>> {
			const outcome = await db.transaction(async (tx) => {
				const [product] = await tx
					.select()
					.from(products)
					.where(
						and(
							eq(products.id, productId),
							or(eq(products.makerId, makerId), eq(products.uid, makerId))
						)
					)
					.for('update')
					.limit(1);
				if (!product)
					return fail<MakerInterestError>(404, 'listing_not_found', 'Listing not found.');

				const [campaign] = await tx
					.select()
					.from(interestCampaigns)
					.where(eq(interestCampaigns.productId, productId))
					.for('update')
					.limit(1);
				if (!campaign) {
					return fail<MakerInterestError>(
						409,
						'not_an_interest_listing',
						'This listing is not an interest check.'
					);
				}
				if (campaign.status === INTEREST_STATUS.CLOSED) {
					return fail<MakerInterestError>(
						409,
						'interest_not_open',
						'This interest check was closed and cannot be launched.'
					);
				}

				if (campaign.status === INTEREST_STATUS.OPEN) {
					if (product.listingState !== 'live') {
						return fail<MakerInterestError>(
							409,
							'listing_not_live',
							'The listing must be approved and live before you launch it.'
						);
					}
					const now = nowIso();
					const message = body.message?.trim() ? body.message.trim() : null;
					const updated = await tx
						.update(interestCampaigns)
						.set({
							status: INTEREST_STATUS.LAUNCHED,
							launchedAt: now,
							launchMessage: message,
							updatedAt: now
						})
						.where(
							and(
								eq(interestCampaigns.productId, productId),
								eq(interestCampaigns.status, INTEREST_STATUS.OPEN)
							)
						)
						.returning({ productId: interestCampaigns.productId });
					if (updated.length > 0) {
						await tx
							.update(products)
							.set({ stock: { count: body.stock_count, status: 'in-stock' } })
							.where(eq(products.id, productId));
						await writeAudit(tx, {
							actorUserId: makerId,
							entityType: 'product',
							entityId: productId,
							action: 'interest.launched',
							fromState: INTEREST_STATUS.OPEN,
							toState: INTEREST_STATUS.LAUNCHED,
							meta: {
								stockCount: body.stock_count,
								interestedCount: await countActiveInterests(tx, productId)
							}
						});
						campaign.launchMessage = message;
					}
				}

				return { ok: true as const, product, message: campaign.launchMessage };
			});

			if (!outcome.ok) return outcome;

			const { product } = outcome;
			const makerName = await loadMakerName(db, product);
			const email = renderInterestLaunchedEmail({
				siteUrl: deps.siteUrl,
				productName: product.name ?? 'Your listing',
				makerName,
				priceInr: product.price?.new ?? 0,
				deliveryFeeInr: DELIVERY_FLAT_FEE,
				message: outcome.message,
				buyUrl: listingUrl(product)
			});
			const result = await notifyPending(productId, 'launched', email);
			return { ok: true, response: { status: INTEREST_STATUS.LAUNCHED, ...result } };
		},

		/** Close: the maker is not going ahead. Same retry rules as launch. */
		async close(
			makerId: string,
			productId: string,
			body: CloseInterestBody
		): Promise<Result<InterestNotifyResponse, MakerInterestError>> {
			const outcome = await db.transaction(async (tx) => {
				const [product] = await tx
					.select()
					.from(products)
					.where(
						and(
							eq(products.id, productId),
							or(eq(products.makerId, makerId), eq(products.uid, makerId))
						)
					)
					.for('update')
					.limit(1);
				if (!product)
					return fail<MakerInterestError>(404, 'listing_not_found', 'Listing not found.');

				const [campaign] = await tx
					.select()
					.from(interestCampaigns)
					.where(eq(interestCampaigns.productId, productId))
					.for('update')
					.limit(1);
				if (!campaign) {
					return fail<MakerInterestError>(
						409,
						'not_an_interest_listing',
						'This listing is not an interest check.'
					);
				}
				if (campaign.status === INTEREST_STATUS.LAUNCHED) {
					return fail<MakerInterestError>(
						409,
						'interest_not_open',
						'This interest check has launched and cannot be closed.'
					);
				}

				if (campaign.status === INTEREST_STATUS.OPEN) {
					const now = nowIso();
					const message = body.message?.trim() ? body.message.trim() : null;
					const updated = await tx
						.update(interestCampaigns)
						.set({
							status: INTEREST_STATUS.CLOSED,
							closedAt: now,
							launchMessage: message,
							updatedAt: now
						})
						.where(
							and(
								eq(interestCampaigns.productId, productId),
								eq(interestCampaigns.status, INTEREST_STATUS.OPEN)
							)
						)
						.returning({ productId: interestCampaigns.productId });
					if (updated.length > 0) {
						await writeAudit(tx, {
							actorUserId: makerId,
							entityType: 'product',
							entityId: productId,
							action: 'interest.closed',
							fromState: INTEREST_STATUS.OPEN,
							toState: INTEREST_STATUS.CLOSED,
							meta: { interestedCount: await countActiveInterests(tx, productId) }
						});
						campaign.launchMessage = message;
					}
				}

				return { ok: true as const, product, message: campaign.launchMessage };
			});

			if (!outcome.ok) return outcome;

			const { product } = outcome;
			const makerName = await loadMakerName(db, product);
			const email = renderInterestClosedEmail({
				siteUrl: deps.siteUrl,
				productName: product.name ?? 'This listing',
				makerName,
				message: outcome.message
			});
			const result = await notifyPending(productId, 'closed', email);
			return { ok: true, response: { status: INTEREST_STATUS.CLOSED, ...result } };
		},

		/** Staff: every interest check with its counts. */
		async adminListCampaigns(): Promise<AdminInterestCampaigns> {
			const stats = interestStatsSubquery(db);
			const rows = await db
				.select({
					productId: products.id,
					productName: products.name,
					author: products.author,
					displayName: makers.displayName,
					username: users.username,
					stats: {
						status: stats.status,
						targetCount: stats.targetCount,
						shipsWithinDays: stats.shipsWithinDays,
						note: stats.note,
						interestedCount: stats.interestedCount
					}
				})
				.from(stats)
				.innerJoin(products, eq(products.id, stats.productId))
				.leftJoin(makers, eq(makers.id, sql`coalesce(${products.makerId}, ${products.uid})`))
				.leftJoin(users, eq(users.id, sql`coalesce(${products.makerId}, ${products.uid})`))
				.orderBy(desc(products.createdAt));

			return {
				campaigns: rows.flatMap((row) => {
					const interest = productInterestFromStats(row.stats);
					if (!interest) return [];
					return [
						{
							productId: row.productId,
							productName: row.productName ?? '',
							makerName: row.displayName ?? row.username ?? row.author ?? null,
							interest
						}
					];
				})
			};
		},

		/** Staff: the full list for one interest check, withdrawn people included. */
		async adminGetCampaign(productId: string): Promise<AdminInterestList | null> {
			const [product] = await db
				.select({ id: products.id, name: products.name })
				.from(products)
				.where(eq(products.id, productId))
				.limit(1);
			if (!product) return null;
			const interest = (await loadProductInterests(db, [productId])).get(productId);
			if (!interest) return null;

			const entries = await db
				.select()
				.from(productInterests)
				.where(eq(productInterests.productId, productId))
				.orderBy(asc(productInterests.createdAt));

			return {
				productId,
				productName: product.name ?? '',
				interest,
				entries: entries.map((entry) => ({
					id: entry.id,
					userId: entry.userId,
					name: entry.name,
					email: entry.email,
					phone: entry.phone,
					address: entry.address,
					createdAt: toIso(entry.createdAt) ?? '',
					withdrawnAt: toIso(entry.withdrawnAt),
					notifiedAt: toIso(entry.notifiedAt)
				}))
			};
		}
	};
}
