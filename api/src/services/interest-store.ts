import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { CheckoutAddress } from '../contracts/address.js';
import { DELIVERY_FLAT_FEE } from '../contracts/cart.js';
import {
	INTEREST_SMALL_GROUP,
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
	type MyInterestsResponse,
	type ProductInterest
} from '../contracts/interest.js';
import type { Database, DbExecutor } from '../db/index.js';
import { cartItems } from '../db/schema/cartItems.js';
import { interestCampaigns, interestJoinNotices, productInterests } from '../db/schema/interest.js';
import { listingReviews } from '../db/schema/makerApplications.js';
import { makers } from '../db/schema/makers.js';
import { orderItems } from '../db/schema/orderItems.js';
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
 * campaign row. Joining takes a share lock on the product (so the listing cannot leave `live`
 * while someone joins) and an update lock on the campaign (so a launch or close never misses
 * someone who joined while it was running, and the commitment lock is set exactly once).
 *
 * Personal details are kept only while needed: leaving deletes the row, a launch notice blanks
 * the phone and address, and a closure notice deletes the row.
 */

export const INTEREST_NOT_ALLOWED_MESSAGE =
	"This listing has already been on sale, so it can't become an interest check. Create a new listing for it.";

/** "Joined" e-mails to one person for one listing are at most this often. */
export const JOINED_EMAIL_MIN_INTERVAL_MS = 10 * 60 * 1000;

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
 * One row per campaign with its count of people on the list. Join it on `product_id` the same
 * way review stats are joined.
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
			commitmentLockedAt: interestCampaigns.commitmentLockedAt,
			interestedCount: sql<number>`count(${productInterests.id})::int`.as('interested_count'),
			unnotifiedCount:
				sql<number>`count(${productInterests.id}) filter (where ${productInterests.notifiedAt} is null)::int`.as(
					'unnotified_count'
				)
		})
		.from(interestCampaigns)
		.leftJoin(productInterests, eq(productInterests.productId, interestCampaigns.productId))
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
				pending_count: row.status === INTEREST_STATUS.OPEN ? 0 : Number(row.unnotifiedCount ?? 0),
				locked: row.commitmentLockedAt != null,
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
		.where(eq(productInterests.productId, productId));
	return Number(row?.value ?? 0);
}

/**
 * True when the product has never been on sale: no approval on record (it was never `live` or
 * `paused`), and nobody has ever ordered it or put it in a cart.
 */
async function hasNeverBeenOnSale(executor: Selectable, productId: string): Promise<boolean> {
	const [reviewed, ordered, carted] = await Promise.all([
		executor
			.select({ id: listingReviews.id })
			.from(listingReviews)
			.where(
				and(
					eq(listingReviews.productId, productId),
					or(
						inArray(listingReviews.toState, ['live', 'paused']),
						inArray(listingReviews.fromState, ['live', 'paused'])
					)
				)
			)
			.limit(1),
		executor
			.select({ productId: orderItems.productId })
			.from(orderItems)
			.where(eq(orderItems.productId, productId))
			.limit(1),
		executor
			.select({ productId: cartItems.productId })
			.from(cartItems)
			.where(eq(cartItems.productId, productId))
			.limit(1)
	]);
	return reviewed.length === 0 && ordered.length === 0 && carted.length === 0;
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
 * - Once anyone has ever joined (`commitment_locked_at`), the target and shipping time are fixed
 *   and the check cannot be turned off (409 `interest_locked`), even if everyone has since
 *   left. The note can still change.
 * - Only a listing that has never been on sale can become one: its state is draft, rejected or
 *   pending review, no approval is on record, and no order or cart line refers to it.
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
		if (campaign.commitmentLockedAt != null) {
			throw new InterestRuleError('interest_locked', 409, INTEREST_LOCKED_MESSAGE);
		}
		await tx.delete(interestCampaigns).where(eq(interestCampaigns.productId, productId));
		return { changed: true };
	}

	const settings = requireSettings(input);
	const note = input.note === undefined ? (campaign?.note ?? null) : settings.note;

	if (!campaign) {
		if (!INTEREST_ENABLE_STATES.has(listingState) || !(await hasNeverBeenOnSale(tx, productId))) {
			throw new InterestRuleError('interest_not_allowed', 409, INTEREST_NOT_ALLOWED_MESSAGE);
		}
		await tx.insert(interestCampaigns).values({ productId, ...settings, note });
		return { changed: true };
	}

	const commitmentChanged =
		campaign.targetCount !== settings.targetCount ||
		campaign.shipsWithinDays !== settings.shipsWithinDays;
	if (commitmentChanged && campaign.commitmentLockedAt != null) {
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

/**
 * Merges small places for the maker summary. A state is listed only with at least
 * INTEREST_SMALL_GROUP people; a city only with at least that many AND only if the people of
 * its state not covered by its listed cities number 0 or at least INTEREST_SMALL_GROUP (else the
 * smallest listed cities of that state are folded in too). Everything not listed goes into one
 * "other" row, so no count below the threshold can be read off or recovered by subtraction.
 */
export function groupSmallPlaces(places: { city: string; state: string; count: number }[]): {
	total: number;
	byState: MakerInterestSummary['byState'];
	byCity: MakerInterestSummary['byCity'];
} {
	const small = INTEREST_SMALL_GROUP;
	const total = places.reduce((sum, place) => sum + place.count, 0);
	const byDesc = <T extends { count: number }>(a: T & { name: string }, b: T & { name: string }) =>
		b.count - a.count || a.name.localeCompare(b.name);

	const stateTotals = new Map<string, number>();
	for (const place of places) {
		stateTotals.set(place.state, (stateTotals.get(place.state) ?? 0) + place.count);
	}
	const shownStates = [...stateTotals]
		.map(([name, count]) => ({ name, count }))
		.filter((state) => state.count >= small)
		.sort(byDesc);

	const shownCities: { city: string; state: string; count: number }[] = [];
	for (const state of shownStates) {
		const cities = places
			.filter((place) => place.state === state.name && place.count >= small)
			.map((place) => ({ ...place, name: place.city }))
			.sort(byDesc);
		let rest = state.count - cities.reduce((sum, city) => sum + city.count, 0);
		while (cities.length > 0 && rest > 0 && rest < small) {
			rest += cities.pop()!.count;
		}
		shownCities.push(...cities.map(({ city, count }) => ({ city, state: state.name, count })));
	}
	shownCities.sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));

	const stateOther = total - shownStates.reduce((sum, state) => sum + state.count, 0);
	const cityOther = total - shownCities.reduce((sum, city) => sum + city.count, 0);
	return {
		total,
		byState: [
			...shownStates.map((state) => ({ state: state.name, count: state.count })),
			...(stateOther > 0 ? [{ state: '', count: stateOther }] : [])
		],
		byCity: [...shownCities, ...(cityOther > 0 ? [{ city: '', state: '', count: cityOther }] : [])]
	};
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export type InterestStoreDeps = {
	siteUrl: string;
	/** Sends one e-mail and resolves only once it has been accepted for delivery. */
	deliver(to: string, email: RenderedEmail): Promise<void>;
	/**
	 * Wait before sending the "joined" e-mail, so someone who leaves straight away is not
	 * e-mailed. Default 0.
	 */
	joinedEmailDelayMs?: number;
};

export type BuyerInterestError =
	'product_not_found' | 'interest_closed' | 'own_listing' | 'invalid_payload';

export type MakerInterestError =
	'listing_not_found' | 'not_an_interest_listing' | 'interest_not_open' | 'listing_not_live';

export type InterestStore = ReturnType<typeof createInterestStore>;

export function createInterestStore(db: Database, deps: InterestStoreDeps) {
	/** Sending loops running in this process, one per campaign at most. */
	const sending = new Map<string, Promise<void>>();

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

	async function countPending(executor: Selectable, productId: string): Promise<number> {
		const [row] = await executor
			.select({ value: sql<number>`count(*)::int` })
			.from(productInterests)
			.where(and(eq(productInterests.productId, productId), isNull(productInterests.notifiedAt)));
		return Number(row?.value ?? 0);
	}

	/**
	 * E-mails everyone on the list who has not been e-mailed yet, one at a time. Each person's
	 * row is locked while their e-mail is sent (SKIP LOCKED), so two loops never e-mail the same
	 * person. Once the send succeeded, in the same statement that records it, a launch notice
	 * blanks the phone and address (name and e-mail stay for the count and the staff view) and
	 * a closure notice deletes the row.
	 */
	async function notifyPending(
		productId: string,
		kind: 'launched' | 'closed',
		email: RenderedEmail
	): Promise<void> {
		const candidates = await db
			.select({ id: productInterests.id })
			.from(productInterests)
			.where(and(eq(productInterests.productId, productId), isNull(productInterests.notifiedAt)))
			.orderBy(asc(productInterests.createdAt));

		for (const candidate of candidates) {
			try {
				await db.transaction(async (tx) => {
					const [row] = await tx
						.select({ id: productInterests.id, email: productInterests.email })
						.from(productInterests)
						.where(and(eq(productInterests.id, candidate.id), isNull(productInterests.notifiedAt)))
						.for('update', { skipLocked: true })
						.limit(1);
					if (!row || !row.email) return;
					await deps.deliver(row.email, email);
					if (kind === 'launched') {
						await tx
							.update(productInterests)
							.set({
								notifiedAt: nowIso(),
								updatedAt: nowIso(),
								phone: '',
								address: {} as CheckoutAddress
							})
							.where(eq(productInterests.id, row.id));
					} else {
						await tx.delete(productInterests).where(eq(productInterests.id, row.id));
					}
					await tx
						.update(interestCampaigns)
						.set({ notifiedCount: sql`${interestCampaigns.notifiedCount} + 1` })
						.where(eq(interestCampaigns.productId, productId));
				});
			} catch (error) {
				storeLog('warn', 'interest.notify_failed', {
					productId,
					interestId: candidate.id,
					kind,
					error: errorMessage(error)
				});
			}
		}
	}

	/**
	 * Starts the sending loop in the background unless one is already running for this campaign
	 * in this process. Not awaited by the request. If the process stops mid-loop, the people not
	 * yet e-mailed stay pending until the maker calls launch or close again.
	 */
	function startSending(
		productId: string,
		kind: 'launched' | 'closed',
		renderEmail: () => Promise<RenderedEmail>
	) {
		if (sending.has(productId)) return;
		const loop = (async () => {
			try {
				await notifyPending(productId, kind, await renderEmail());
			} catch (error) {
				storeLog('error', 'interest.notify_loop_failed', {
					productId,
					kind,
					error: errorMessage(error)
				});
			} finally {
				sending.delete(productId);
			}
		})();
		sending.set(productId, loop);
	}

	async function notifyCounts(productId: string): Promise<{ notified: number; pending: number }> {
		const [campaign] = await db
			.select({ notifiedCount: interestCampaigns.notifiedCount })
			.from(interestCampaigns)
			.where(eq(interestCampaigns.productId, productId))
			.limit(1);
		return {
			notified: Number(campaign?.notifiedCount ?? 0),
			pending: await countPending(db, productId)
		};
	}

	/**
	 * Sends the "joined" e-mail unless the person has left in the meantime, or was sent one for
	 * this listing in the last 10 minutes.
	 */
	async function sendJoinedEmail(userId: string, productId: string) {
		const delay = deps.joinedEmailDelayMs ?? 0;
		if (delay > 0) {
			await new Promise<void>((resolve) => setTimeout(resolve, delay).unref?.());
		}
		await db.transaction(async (tx) => {
			const [row] = await tx
				.select({ email: productInterests.email })
				.from(productInterests)
				.where(and(eq(productInterests.productId, productId), eq(productInterests.userId, userId)))
				.limit(1);
			if (!row?.email) return;

			const now = nowIso();
			const cutoff = new Date(Date.now() - JOINED_EMAIL_MIN_INTERVAL_MS).toISOString();
			const claimed = await tx
				.insert(interestJoinNotices)
				.values({ productId, userId, sentAt: now })
				.onConflictDoUpdate({
					target: [interestJoinNotices.productId, interestJoinNotices.userId],
					set: { sentAt: now },
					setWhere: sql`${interestJoinNotices.sentAt} < ${cutoff}`
				})
				.returning({ productId: interestJoinNotices.productId });
			if (claimed.length === 0) return;

			const [product] = await tx.select().from(products).where(eq(products.id, productId)).limit(1);
			const [campaign] = await tx
				.select()
				.from(interestCampaigns)
				.where(eq(interestCampaigns.productId, productId))
				.limit(1);
			if (!product || !campaign) return;
			const makerName = await loadMakerName(tx, product);
			// If this send fails, the claim is rolled back with the transaction.
			await deps.deliver(
				row.email,
				renderInterestJoinedEmail({
					siteUrl: deps.siteUrl,
					productName: product.name ?? 'this listing',
					makerName,
					targetCount: campaign.targetCount,
					interestedCount: await countActiveInterests(tx, productId),
					shipsWithinDays: campaign.shipsWithinDays,
					listingUrl: listingUrl(product)
				})
			);
		});
	}

	return {
		/** Resolves once every background sending loop of this store has finished (tests, shutdown). */
		async drainNotifications(): Promise<void> {
			while (sending.size > 0) {
				await Promise.all([...sending.values()]);
			}
		},

		async getMyInterest(userId: string, productId: string): Promise<MyInterestResponse> {
			const [[row], [product]] = await Promise.all([
				db
					.select({ createdAt: productInterests.createdAt })
					.from(productInterests)
					.where(
						and(eq(productInterests.productId, productId), eq(productInterests.userId, userId))
					)
					.limit(1),
				db
					.select({ uid: products.uid, makerId: products.makerId })
					.from(products)
					.where(eq(products.id, productId))
					.limit(1)
			]);
			return {
				interested: Boolean(row),
				since: toIso(row?.createdAt),
				ownListing: Boolean(product && (product.uid === userId || product.makerId === userId))
			};
		},

		/** Every interest check the user is on, whatever its status or the listing's state. */
		async listMyInterests(userId: string): Promise<MyInterestsResponse> {
			const stats = interestStatsSubquery(db);
			const rows = await db
				.select({
					productId: productInterests.productId,
					createdAt: productInterests.createdAt,
					productName: products.name,
					listingState: products.listingState,
					status: stats.status,
					targetCount: stats.targetCount,
					interestedCount: stats.interestedCount
				})
				.from(productInterests)
				.innerJoin(products, eq(products.id, productInterests.productId))
				.innerJoin(stats, eq(stats.productId, productInterests.productId))
				.where(eq(productInterests.userId, userId))
				.orderBy(desc(productInterests.createdAt));
			return {
				interests: rows.map((row) => ({
					productId: row.productId,
					productName: row.productName ?? '',
					productPath:
						row.listingState === 'live' ? productHref(row.productName ?? '', row.productId) : null,
					status: row.status as MyInterestsResponse['interests'][number]['status'],
					targetCount: row.targetCount,
					interestedCount: Number(row.interestedCount ?? 0),
					since: toIso(row.createdAt) ?? ''
				}))
			};
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
				// Share lock: the listing cannot leave `live` until this join has committed.
				const [product] = await tx
					.select()
					.from(products)
					.where(eq(products.id, productId))
					.for('share')
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
					.for('update')
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

				const joined = inserted.length > 0;
				if (!joined) {
					await tx
						.update(productInterests)
						.set({ ...values, updatedAt: nowIso() })
						.where(
							and(eq(productInterests.productId, productId), eq(productInterests.userId, userId))
						);
				}
				if (joined && campaign.commitmentLockedAt == null) {
					const now = nowIso();
					await tx
						.update(interestCampaigns)
						.set({ commitmentLockedAt: now, updatedAt: now })
						.where(eq(interestCampaigns.productId, productId));
				}

				const interestedCount = await countActiveInterests(tx, productId);
				return { ok: true as const, joined, interestedCount };
			});

			if (!outcome.ok) return outcome;

			if (outcome.joined && email) {
				sendJoinedEmail(userId, productId).catch((error) => {
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

		/**
		 * Leaving deletes the person's row, whatever the campaign status and whether or not the
		 * listing is public. Safe to repeat.
		 */
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
			await db
				.delete(productInterests)
				.where(and(eq(productInterests.productId, productId), eq(productInterests.userId, userId)));
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

			const stateExpr = sql<string>`coalesce(nullif(trim(${productInterests.address}->>'state'), ''), 'Unknown')`;
			const cityExpr = sql<string>`coalesce(nullif(trim(${productInterests.address}->>'city'), ''), 'Unknown')`;

			// Counts only: no names, phone numbers, e-mail addresses or street addresses.
			const [places, pending] = await Promise.all([
				db
					.select({ city: cityExpr, state: stateExpr, count: sql<number>`count(*)::int` })
					.from(productInterests)
					.where(eq(productInterests.productId, productId))
					.groupBy(cityExpr, stateExpr),
				countPending(db, productId)
			]);
			const groups = groupSmallPlaces(
				places.map((row) => ({ city: row.city, state: row.state, count: Number(row.count) }))
			);

			return {
				ok: true,
				response: {
					status: campaign.status as MakerInterestSummary['status'],
					targetCount: campaign.targetCount,
					shipsWithinDays: campaign.shipsWithinDays,
					interestedCount: groups.total,
					notifiedCount: campaign.notifiedCount,
					pendingCount: campaign.status === INTEREST_STATUS.OPEN ? 0 : pending,
					byState: groups.byState,
					byCity: groups.byCity
				}
			};
		},

		/**
		 * Launch: the listing becomes an ordinary one with `stock_count` units and everyone on the
		 * list is e-mailed in the background. Returns at once. Calling it again never resets the
		 * stock and resumes sending to whoever is still pending.
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
					await tx
						.update(interestCampaigns)
						.set({
							status: INTEREST_STATUS.LAUNCHED,
							launchedAt: now,
							launchMessage: message,
							updatedAt: now
						})
						.where(eq(interestCampaigns.productId, productId));
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

				return { ok: true as const, product, message: campaign.launchMessage };
			});

			if (!outcome.ok) return outcome;

			const counts = await notifyCounts(productId);
			if (counts.pending > 0) {
				const { product, message } = outcome;
				startSending(productId, 'launched', async () =>
					renderInterestLaunchedEmail({
						siteUrl: deps.siteUrl,
						productName: product.name ?? 'Your listing',
						makerName: await loadMakerName(db, product),
						priceInr: product.price?.new ?? 0,
						deliveryFeeInr: DELIVERY_FLAT_FEE,
						message,
						buyUrl: listingUrl(product)
					})
				);
			}
			return { ok: true, response: { status: INTEREST_STATUS.LAUNCHED, ...counts } };
		},

		/** Close: the maker is not going ahead. Same background sending and resume rules as launch. */
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
					await tx
						.update(interestCampaigns)
						.set({
							status: INTEREST_STATUS.CLOSED,
							closedAt: now,
							launchMessage: message,
							updatedAt: now
						})
						.where(eq(interestCampaigns.productId, productId));
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

				return { ok: true as const, product, message: campaign.launchMessage };
			});

			if (!outcome.ok) return outcome;

			const counts = await notifyCounts(productId);
			if (counts.pending > 0) {
				const { product, message } = outcome;
				startSending(productId, 'closed', async () =>
					renderInterestClosedEmail({
						siteUrl: deps.siteUrl,
						productName: product.name ?? 'This listing',
						makerName: await loadMakerName(db, product),
						message
					})
				);
			}
			return { ok: true, response: { status: INTEREST_STATUS.CLOSED, ...counts } };
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

		/**
		 * Staff: the full list for one interest check. People who left are gone; after a launch
		 * notice their phone is '' and their address is {}.
		 */
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
					withdrawnAt: null,
					notifiedAt: toIso(entry.notifiedAt)
				}))
			};
		}
	};
}
