import { eq } from 'drizzle-orm';
import type { SendChatMessageBody, SendChatMessageResponse } from '../contracts/chats.js';
import type { Database } from '../db/index.js';
import { chat } from '../db/schema/chat.js';
import { printrequests } from '../db/schema/printrequests.js';
import type { Actor } from '../types/context.js';

export type SendChatMessageResult =
	| { ok: true; response: SendChatMessageResponse }
	| { ok: false; status: 403; body: { error: 'forbidden' } }
	| { ok: false; status: 404; body: { error: 'not_found' } }
	| { ok: false; status: 400; body: { error: 'empty_message' | 'invalid_recipient' } };

export interface ChatsStore {
	sendMessage(actor: Actor, body: SendChatMessageBody): Promise<SendChatMessageResult>;
}

function trimMessage(message: string): string {
	return message.trim();
}

export function createChatsStore(db: Database): ChatsStore {
	return {
		async sendMessage(actor, body) {
			const actorId = actor.userId;
			if (!actorId) {
				return { ok: false, status: 403, body: { error: 'forbidden' } };
			}

			const message = trimMessage(body.message);
			if (!message) {
				return { ok: false, status: 400, body: { error: 'empty_message' } };
			}

			const [row] = await db
				.select({
					userId: printrequests.userId,
					creatorId: printrequests.creatorId
				})
				.from(printrequests)
				.where(eq(printrequests.id, body.relationship_id))
				.limit(1);

			if (!row?.userId || !row.creatorId) {
				return { ok: false, status: 404, body: { error: 'not_found' } };
			}

			const isParticipant = actorId === row.userId || actorId === row.creatorId;
			if (!isParticipant) {
				return { ok: false, status: 403, body: { error: 'forbidden' } };
			}

			const otherPartyId = actorId === row.userId ? row.creatorId : row.userId;
			if (body.recipient_id !== otherPartyId) {
				return { ok: false, status: 400, body: { error: 'invalid_recipient' } };
			}

			const [inserted] = await db
				.insert(chat)
				.values({
					senderId: actorId,
					recipientId: body.recipient_id,
					relationshipId: body.relationship_id,
					message,
					messageType: body.message_type,
					status: body.status ?? 'sent'
				})
				.returning({
					chatId: chat.chatId,
					createdAt: chat.createdAt
				});

			if (!inserted) {
				return { ok: false, status: 403, body: { error: 'forbidden' } };
			}

			return {
				ok: true,
				response: {
					chat_id: inserted.chatId,
					created_at: inserted.createdAt.toISOString()
				}
			};
		}
	};
}
