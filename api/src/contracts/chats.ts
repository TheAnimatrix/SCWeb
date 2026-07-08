import { z } from 'zod';

export const sendChatMessageBodySchema = z
	.object({
		relationship_id: z.string().uuid(),
		recipient_id: z.string().uuid(),
		message: z.string().min(1).max(4000),
		message_type: z.enum(['text']),
		status: z.literal('sent').optional()
	})
	.strict();

export type SendChatMessageBody = z.infer<typeof sendChatMessageBodySchema>;

export const sendChatMessageResponseSchema = z.object({
	chat_id: z.string().uuid(),
	created_at: z.string()
});

export type SendChatMessageResponse = z.infer<typeof sendChatMessageResponseSchema>;
