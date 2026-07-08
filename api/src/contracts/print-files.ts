import { z } from 'zod';

export const printRequestIdParamSchema = z
	.object({
		printRequestId: z.string().uuid()
	})
	.strict();

export const uploadMetadataSchema = z
	.object({
		maker_id: z.string().uuid(),
		color: z.string().min(1),
		material: z.string().min(1),
		quality: z.string().min(1),
		scale: z.string().min(1),
		infill: z.string().min(1)
	})
	.strict();

export const rawUploadQuerySchema = uploadMetadataSchema
	.extend({
		filename: z.string().min(1).max(255).optional()
	})
	.strict();

export type UploadMetadata = z.infer<typeof uploadMetadataSchema>;

export type DownloadUrlResponse = {
	url: string;
	expiresAt: string;
};

export type UploadPrintFileResponse = {
	printRequest: {
		id: string;
		user_id: string | null;
		creator_id: string | null;
		model: string | null;
		model_metadata: unknown;
		model_data: unknown;
		request_stage: string | null;
		created_at: string;
	};
};
