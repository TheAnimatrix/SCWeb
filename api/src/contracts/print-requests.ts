import { z } from 'zod';
import { printRequestIdParamSchema } from './print-files.js';

export { printRequestIdParamSchema };

const positiveIntRupees = z.number().int().positive();

export const quoteActionPayloadSchema = z
	.object({
		amount: positiveIntRupees,
		reason: z.string().max(2000).optional()
	})
	.strict();

export const cancelActionPayloadSchema = z
	.object({
		reason: z.string().trim().min(1).max(2000)
	})
	.strict();

export const shippedActionPayloadSchema = z
	.object({
		courier: z.string().trim().min(1).max(200),
		tracking_id: z.string().trim().max(500).optional(),
		tracking_link: z.string().trim().url().max(2000).optional()
	})
	.strict()
	.refine((data) => Boolean(data.tracking_id || data.tracking_link), {
		message: 'tracking_id or tracking_link is required'
	});

export const completeActionPayloadSchema = z
	.object({
		reason: z.string().max(2000).optional()
	})
	.strict();

export const printRequestActionBodySchema = z.union([
	z.object({ action: z.literal('quote'), payload: quoteActionPayloadSchema }).strict(),
	z.object({ action: z.literal('decline'), payload: cancelActionPayloadSchema }).strict(),
	z.object({ action: z.literal('cancel'), payload: cancelActionPayloadSchema }).strict(),
	z.object({ action: z.literal('shipped'), payload: shippedActionPayloadSchema }).strict(),
	z
		.object({
			action: z.literal('complete'),
			payload: completeActionPayloadSchema.optional()
		})
		.strict()
]);

export type PrintRequestActionBody = z.infer<typeof printRequestActionBodySchema>;

export const printRequestActionResponseSchema = z.object({
	id: z.string().uuid(),
	requestStage: z.string().nullable()
});

export type PrintRequestActionResponse = z.infer<typeof printRequestActionResponseSchema>;
