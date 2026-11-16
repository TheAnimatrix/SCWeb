import { z } from 'zod';
import { checkoutAddressSchema } from './address.js';

/**
 * Interest checks: a listing that collects "I'd buy this" before the maker produces it.
 *
 * A product is an interest check while it has a campaign row with status `open`. Nothing is
 * paid and nothing is ordered. When the maker launches, the campaign becomes `launched`, the
 * product is sold like any other listing, and everyone who showed interest is e-mailed a link.
 * `closed` means the maker decided not to produce it.
 *
 * This file is the contract shared by the API and the web app. Change it in one place.
 */

export const INTEREST_STATUS = {
	OPEN: 'open',
	LAUNCHED: 'launched',
	CLOSED: 'closed'
} as const;

export const interestStatusSchema = z.enum(['open', 'launched', 'closed']);

export const INTEREST_TARGET_MIN = 1;
export const INTEREST_TARGET_MAX = 10000;
export const INTEREST_SHIP_DAYS_MIN = 1;
export const INTEREST_SHIP_DAYS_MAX = 365;
export const INTEREST_NOTE_MAX = 500;
export const INTEREST_LAUNCH_MESSAGE_MAX = 1000;

/** What every product response carries: `interest` is null for an ordinary listing. */
export const productInterestSchema = z.object({
	status: interestStatusSchema,
	/** How many people the maker wants before producing. */
	targetCount: z.number().int(),
	/** People currently on the list (withdrawn ones are not counted). */
	interestedCount: z.number().int(),
	/** The maker's commitment: ships within this many days of reaching the target. */
	shipsWithinDays: z.number().int(),
	/** Optional short note from the maker, shown under the commitment. Plain text. */
	note: z.string().nullable()
});

/** GET /products/:productId/interest/me (signed in) */
export const myInterestResponseSchema = z.object({
	interested: z.boolean(),
	/** ISO timestamp of when they joined, or null. */
	since: z.string().nullable()
});

/** POST /products/:productId/interest (signed in). Posting again updates the address. */
export const showInterestBodySchema = z.object({
	/** Same rules as a checkout address: name, line1, line2?, city, state, pincode, phone. */
	address: checkoutAddressSchema
});

/** Response of POST and DELETE /products/:productId/interest */
export const interestChangeResponseSchema = z.object({
	interested: z.boolean(),
	interestedCount: z.number().int()
});

/**
 * Error bodies (`{ error, message }`) for the buyer endpoints:
 * - 401 `unauthorized`      not signed in
 * - 404 `product_not_found` no such live listing
 * - 409 `interest_closed`   the listing is not an open interest check
 * - 409 `own_listing`       makers cannot add themselves to their own list
 * - 400 `invalid_payload`   address failed validation (message says which field)
 */
export const interestErrorSchema = z.enum([
	'unauthorized',
	'product_not_found',
	'interest_closed',
	'own_listing',
	'invalid_payload'
]);

/**
 * Maker portal: sent as `interest` inside the existing listing create/update body.
 * `enabled: false` (or omitting `interest`) makes it an ordinary listing.
 * Once at least one person has shown interest, `target_count` and `ships_within_days` are a
 * commitment and can no longer be changed by the maker (409 `interest_locked`).
 */
export const listingInterestInputSchema = z.object({
	enabled: z.boolean(),
	target_count: z.number().int().min(INTEREST_TARGET_MIN).max(INTEREST_TARGET_MAX).optional(),
	ships_within_days: z
		.number()
		.int()
		.min(INTEREST_SHIP_DAYS_MIN)
		.max(INTEREST_SHIP_DAYS_MAX)
		.optional(),
	note: z.string().trim().max(INTEREST_NOTE_MAX).nullable().optional()
});

/** What maker-portal listing rows carry (null for an ordinary listing). */
export const makerListingInterestSchema = z.object({
	status: interestStatusSchema,
	target_count: z.number().int(),
	ships_within_days: z.number().int(),
	note: z.string().nullable(),
	interested_count: z.number().int(),
	launched_at: z.string().nullable(),
	closed_at: z.string().nullable()
});

/**
 * GET /makers/me/listings/:productId/interest
 * Counts only. Makers never see names, phone numbers, e-mail addresses or street addresses.
 */
export const makerInterestSummarySchema = z.object({
	status: interestStatusSchema,
	targetCount: z.number().int(),
	shipsWithinDays: z.number().int(),
	interestedCount: z.number().int(),
	/** How many of them have been e-mailed the launch (or closure) notice. */
	notifiedCount: z.number().int(),
	byState: z.array(z.object({ state: z.string(), count: z.number().int() })),
	byCity: z.array(z.object({ city: z.string(), state: z.string(), count: z.number().int() }))
});

/**
 * POST /makers/me/listings/:productId/interest/launch
 * Turns the listing into an ordinary one with `stock_count` units and e-mails everyone on the
 * list a link to buy. Safe to call again: only people not yet e-mailed are e-mailed.
 */
export const launchInterestBodySchema = z.object({
	stock_count: z.number().int().min(1),
	/** Optional words from the maker, included in the e-mail. Plain text. */
	message: z.string().trim().max(INTEREST_LAUNCH_MESSAGE_MAX).optional()
});

/**
 * POST /makers/me/listings/:productId/interest/close
 * The maker is not going ahead. E-mails everyone on the list to say so.
 */
export const closeInterestBodySchema = z.object({
	message: z.string().trim().max(INTEREST_LAUNCH_MESSAGE_MAX).optional()
});

/** Response of launch and close. */
export const interestNotifyResponseSchema = z.object({
	status: interestStatusSchema,
	/** E-mails sent by this call. */
	notified: z.number().int(),
	/** People still waiting for an e-mail because sending failed; call again to retry. */
	pending: z.number().int()
});

/**
 * Maker error bodies: 404 `listing_not_found`, 409 `not_an_interest_listing`,
 * 409 `interest_locked` (changing the target after people joined),
 * 409 `interest_not_open` (launching or closing twice is fine; this is for the wrong state).
 */

/** GET /admin/interest/:productId (staff only): the full list, for planning a batch. */
export const adminInterestEntrySchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	name: z.string(),
	email: z.string(),
	phone: z.string(),
	address: checkoutAddressSchema,
	createdAt: z.string(),
	withdrawnAt: z.string().nullable(),
	notifiedAt: z.string().nullable()
});

export const adminInterestListSchema = z.object({
	productId: z.string().uuid(),
	productName: z.string(),
	interest: productInterestSchema,
	entries: z.array(adminInterestEntrySchema)
});

/** GET /admin/interest (staff only): every interest check with its counts. */
export const adminInterestCampaignsSchema = z.object({
	campaigns: z.array(
		z.object({
			productId: z.string().uuid(),
			productName: z.string(),
			makerName: z.string().nullable(),
			interest: productInterestSchema
		})
	)
});

export type InterestStatus = z.infer<typeof interestStatusSchema>;
export type ProductInterest = z.infer<typeof productInterestSchema>;
export type MyInterestResponse = z.infer<typeof myInterestResponseSchema>;
export type ShowInterestBody = z.infer<typeof showInterestBodySchema>;
export type InterestChangeResponse = z.infer<typeof interestChangeResponseSchema>;
export type ListingInterestInput = z.infer<typeof listingInterestInputSchema>;
export type MakerListingInterest = z.infer<typeof makerListingInterestSchema>;
export type MakerInterestSummary = z.infer<typeof makerInterestSummarySchema>;
export type LaunchInterestBody = z.infer<typeof launchInterestBodySchema>;
export type CloseInterestBody = z.infer<typeof closeInterestBodySchema>;
export type InterestNotifyResponse = z.infer<typeof interestNotifyResponseSchema>;
export type AdminInterestEntry = z.infer<typeof adminInterestEntrySchema>;
export type AdminInterestList = z.infer<typeof adminInterestListSchema>;
export type AdminInterestCampaigns = z.infer<typeof adminInterestCampaignsSchema>;
