import { z } from 'zod';

export const makerApprovalStateSchema = z.enum(['pending', 'approved', 'rejected']);

/** Future general maker onboarding form — not wired to UI yet. */
export const makerApplicationSchema = z.object({
	display_name: z.string().trim().min(3).max(100),
	bio: z.string().trim().max(500).optional(),
	city: z.string().trim().max(100).optional()
});

export const makerProfileSchema = z.object({
	id: z.string().uuid(),
	display_name: z.string().nullable(),
	approved_state: makerApprovalStateSchema,
	approved_at: z.string().nullable(),
	created_at: z.string()
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
