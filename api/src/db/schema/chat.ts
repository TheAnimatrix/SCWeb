import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const chat = pgTable('Chat', {
	chatId: uuid('chat_id').primaryKey().defaultRandom(),
	senderId: uuid('sender_id').notNull(),
	recipientId: uuid('recipient_id').notNull(),
	message: text('message'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	messageType: text('message_type'),
	status: text('status'),
	relationshipId: uuid('relationship_id')
});
