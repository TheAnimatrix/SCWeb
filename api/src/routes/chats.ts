import { Hono } from 'hono';
import { sendChatMessageBodySchema } from '../contracts/chats.js';
import { validateJson } from '../lib/validation.js';
import { logCheckoutTransition } from '../middleware/logging.js';
import { requireAuth } from '../middleware/require-auth.js';
import type { ChatsStore } from '../services/chats-store.js';
import type { AppVariables } from '../types/context.js';

export function createChatsRoutes(
	getChatsStore: (c: { get: (key: 'chatsStore') => ChatsStore }) => ChatsStore
) {
	const chatsRoutes = new Hono<{ Variables: AppVariables }>();

	chatsRoutes.post(
		'/chats/messages',
		requireAuth(),
		validateJson(sendChatMessageBodySchema),
		async (c) => {
			const actor = c.get('actor');
			const body = c.req.valid('json');

			const result = await getChatsStore(c).sendMessage(actor, body);

			if (!result.ok) {
				logCheckoutTransition(c, 'warn', 'chats.message.rejected', {
					relationshipId: body.relationship_id,
					error: result.body.error,
					status: result.status
				});
				return c.json(result.body, result.status);
			}

			logCheckoutTransition(c, 'info', 'chats.message.sent', {
				relationshipId: body.relationship_id,
				chatId: result.response.chat_id
			});

			return c.json(result.response);
		}
	);

	return chatsRoutes;
}
