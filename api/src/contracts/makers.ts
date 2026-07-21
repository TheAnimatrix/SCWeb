import { z } from 'zod';

export const makerApprovalStateSchema = z.enum(['pending', 'approved', 'rejected']);
export const storefrontStateSchema = z.enum(['draft', 'live', 'paused', 'suspended']);
export const listingStateSchema = z.enum([
	'draft',
	'pending_review',
	'live',
	'paused',
	'rejected',
	'archived'
]);
export const makerCapabilityKeySchema = z.enum([
	'physical_goods',
	'printing_3d',
	'digital_goods'
]);

/** General maker onboarding form. */
export const makerApplicationSchema = z.object({
	display_name: z.string().trim().min(3).max(100),
	bio: z.string().trim().max(500).optional(),
	city: z.string().trim().max(100).optional(),
	capabilities: z
		.array(makerCapabilityKeySchema)
		.min(1)
		.default(['physical_goods'])
});

export const makerProfileSchema = z.object({
	id: z.string().uuid(),
	display_name: z.string().nullable(),
	approved_state: makerApprovalStateSchema,
	storefront_state: storefrontStateSchema,
	approved_at: z.string().nullable().optional(),
	tagline: z.string().nullable().optional(),
	bio: z.string().nullable().optional(),
	avatar_url: z.string().nullable().optional(),
	banner_url: z.string().nullable().optional(),
	location: z.string().nullable().optional(),
	username: z.string().nullable().optional(),
	capabilities: z.array(makerCapabilityKeySchema).default([]),
	created_at: z.string().optional()
});

export const updateStorefrontBodySchema = z.object({
	display_name: z.string().trim().min(1).max(100).nullable().optional(),
	tagline: z.string().trim().max(160).nullable().optional(),
	bio: z.string().trim().max(2000).nullable().optional(),
	avatar_url: z.string().url().nullable().optional(),
	banner_url: z.string().url().nullable().optional(),
	location: z.string().trim().max(100).nullable().optional(),
	socials: z.record(z.string(), z.string()).nullable().optional(),
	storefront_state: z.enum(['draft', 'live', 'paused']).optional()
});

export const upsertListingBodySchema = z.object({
	product_id: z.string().uuid().optional(),
	name: z.string().trim().min(2).max(200),
	price_new: z.number().int().nonnegative(),
	price_old: z.number().int().nonnegative().optional(),
	stock_count: z.number().int().nonnegative(),
	stock_status: z.string().trim().max(50).optional(),
	type: z.string().trim().max(50).optional(),
	images: z.array(z.object({ url: z.string().url() })).optional(),
	/** Soft fields — editable while live without re-review */
	guarantee: z.string().trim().max(500).nullable().optional(),
	documentation: z
		.array(z.object({ data: z.string(), isMDUrl: z.boolean() }))
		.optional(),
	faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
	submit_for_review: z.boolean().optional()
});

export const updateStockBodySchema = z.object({
	stock_count: z.number().int().nonnegative()
});

export const updateListingDetailsBodySchema = z.object({
	guarantee: z.string().trim().max(500).nullable().optional(),
	documentation: z
		.array(z.object({ data: z.string(), isMDUrl: z.boolean() }))
		.optional(),
	faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional()
});

export const makerListingStateBodySchema = z.object({
	state: z.enum(['paused', 'live', 'archived'])
});

export const reviewApplicationBodySchema = z.object({
	decision: z.enum(['approved', 'rejected']),
	notes: z.string().trim().max(2000).optional()
});

export const reviewListingBodySchema = z.object({
	decision: z.enum(['live', 'rejected', 'paused', 'archived']),
	notes: z.string().trim().max(2000).optional()
});

export const makerFilamentSchema = z.object({
	color: z.string(),
	material_type: z.string()
});

export const makerReviewSchema = z.object({
	rating: z.number(),
	comment: z.string().nullable(),
	created_at: z.string()
});

export const availableMakerSchema = z.object({
	maker_id: z.string().uuid(),
	crafter_name: z.string(),
	approved_state: z.string(),
	avg_quote_time: z.union([z.number(), z.string()]).nullable(),
	avg_rating: z.number().nullable(),
	completed_orders: z.number().nullable(),
	contact_number: z.string().nullable(),
	price_rank: z.number(),
	delivery_rank: z.number(),
	email: z.string().nullable(),
	filaments: z.array(makerFilamentSchema),
	reviews: z.array(makerReviewSchema),
	max_printer_size: z.string().nullable(),
	number_of_printers: z.number().nullable(),
	tier: z.string().nullable()
});

export const listAvailableMakersResponseSchema = z.object({
	makers: z.array(availableMakerSchema)
});

export type MakerApprovalState = z.infer<typeof makerApprovalStateSchema>;
export type MakerApplication = z.infer<typeof makerApplicationSchema>;
export type MakerProfile = z.infer<typeof makerProfileSchema>;
export type MakerFilament = z.infer<typeof makerFilamentSchema>;
export type MakerReview = z.infer<typeof makerReviewSchema>;
export type AvailableMaker = z.infer<typeof availableMakerSchema>;
export type ListAvailableMakersResponse = z.infer<typeof listAvailableMakersResponseSchema>;
export type UpdateStorefrontBody = z.infer<typeof updateStorefrontBodySchema>;
export type UpsertListingBody = z.infer<typeof upsertListingBodySchema>;
