import { eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { printrequests } from '../db/schema/printrequests.js';
import { users } from '../db/schema/users.js';
import { renderOrderStatusUpdateEmail } from './email-templates/index.js';
import type { MailService } from './mail.js';
import { storeLog } from '../middleware/logging.js';

export const PRINT_CHAT_MESSAGE_DEBOUNCE_MS = 10 * 60 * 1000;

type PendingChatMessageEmail = {
	timeout: ReturnType<typeof setTimeout>;
	printRequestId: string;
	recipientUserId: string;
	senderUserId: string;
};

const pendingByRecipient = new Map<string, PendingChatMessageEmail>();

function pendingKey(printRequestId: string, recipientUserId: string): string {
	return `${printRequestId}:${recipientUserId}`;
}

async function resolveSenderDisplayName(
	db: Database,
	mail: MailService,
	senderUserId: string
): Promise<string> {
	const [user] = await db
		.select({ username: users.username, email: users.email })
		.from(users)
		.where(eq(users.id, senderUserId))
		.limit(1);

	if (user?.username?.trim()) {
		return user.username.trim();
	}

	const email = user?.email ?? (await mail.resolveUserEmail(senderUserId));
	if (email) {
		const localPart = email.split('@')[0]?.trim();
		if (localPart) {
			return localPart;
		}
	}

	return 'Someone';
}

function conversationHref(
	mail: MailService,
	printRequestId: string,
	recipientUserId: string,
	parties: { userId: string; creatorId: string }
): string {
	const base = mail.siteUrl;
	if (recipientUserId === parties.userId) {
		return `${base}/3dp-portal/user/${printRequestId}`;
	}

	return `${base}/3dp-portal/maker/${printRequestId}`;
}

async function sendPrintChatMessageEmail(
	db: Database,
	mail: MailService,
	input: {
		printRequestId: string;
		recipientUserId: string;
		senderUserId: string;
	}
): Promise<void> {
	const [row] = await db
		.select({ userId: printrequests.userId, creatorId: printrequests.creatorId })
		.from(printrequests)
		.where(eq(printrequests.id, input.printRequestId))
		.limit(1);

	if (!row?.userId || !row.creatorId) {
		return;
	}

	const isParticipant =
		input.recipientUserId === row.userId || input.recipientUserId === row.creatorId;
	if (!isParticipant) {
		return;
	}

	const to = await mail.resolveUserEmail(input.recipientUserId);
	if (!to) {
		storeLog('warn', 'mail.chat.skipped', {
			reason: 'missing_recipient_email',
			printRequestId: input.printRequestId,
			recipientUserId: input.recipientUserId
		});
		return;
	}

	const senderName = await resolveSenderDisplayName(db, mail, input.senderUserId);
	const href = conversationHref(mail, input.printRequestId, input.recipientUserId, {
		userId: row.userId,
		creatorId: row.creatorId
	});

	const template = renderOrderStatusUpdateEmail({
		siteUrl: mail.siteUrl,
		title: `New message from ${senderName}`,
		preheader: `You received a message from ${senderName}.`,
		intro: `You received a message from ${senderName} about your 3D print request. Open the conversation to read and reply.`,
		orderId: input.printRequestId,
		statusLabel: 'Message',
		cta: {
			label: 'View conversation',
			href
		}
	});

	mail.send(to, template, {
		printRequestId: input.printRequestId,
		recipientUserId: input.recipientUserId,
		senderUserId: input.senderUserId
	});
}

export function schedulePrintChatMessageEmail(
	db: Database,
	mail: MailService,
	input: {
		printRequestId: string;
		recipientUserId: string;
		senderUserId: string;
	},
	options?: { debounceMs?: number }
): void {
	const debounceMs = options?.debounceMs ?? PRINT_CHAT_MESSAGE_DEBOUNCE_MS;
	const key = pendingKey(input.printRequestId, input.recipientUserId);
	const existing = pendingByRecipient.get(key);

	if (existing) {
		clearTimeout(existing.timeout);
		storeLog('info', 'mail.chat.debounced', {
			printRequestId: input.printRequestId,
			recipientUserId: input.recipientUserId,
			senderUserId: input.senderUserId,
			debounceMs
		});
	} else {
		storeLog('info', 'mail.chat.scheduled', {
			printRequestId: input.printRequestId,
			recipientUserId: input.recipientUserId,
			senderUserId: input.senderUserId,
			debounceMs
		});
	}

	const timeout = setTimeout(() => {
		pendingByRecipient.delete(key);
		mail.dispatch('print.message_received', async () => {
			await sendPrintChatMessageEmail(db, mail, {
				printRequestId: input.printRequestId,
				recipientUserId: input.recipientUserId,
				senderUserId: input.senderUserId
			});
		});
	}, debounceMs);

	pendingByRecipient.set(key, {
		timeout,
		printRequestId: input.printRequestId,
		recipientUserId: input.recipientUserId,
		senderUserId: input.senderUserId
	});
}

export function clearPrintChatMessageEmailTimers(): void {
	for (const pending of pendingByRecipient.values()) {
		clearTimeout(pending.timeout);
	}
	pendingByRecipient.clear();
}
