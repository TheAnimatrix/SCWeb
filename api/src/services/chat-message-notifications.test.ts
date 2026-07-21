import { afterEach, describe, expect, it, vi } from 'vitest';
import { emailEnvDefaults } from '../test/env-defaults.js';
import type { EmailService } from './email.js';
import { createMailService, type MailService } from './mail.js';
import {
	clearPrintChatMessageEmailTimers,
	schedulePrintChatMessageEmail
} from './chat-message-notifications.js';

const baseEnv = {
	NODE_ENV: 'test' as const,
	API_PORT: 3001,
	DATABASE_URL: 'postgresql://test',
	SUPABASE_URL: 'https://example.supabase.co',
	SUPABASE_ANON_KEY: 'anon',
	API_CORS_ORIGINS: 'http://localhost:5173',
	CLIENT_ID_COOKIE_NAME: 'clientId',
	RATE_LIMIT_WINDOW_MS: 60_000,
	RATE_LIMIT_MAX_REQUESTS: 120,
	SITE_URL: 'http://localhost:5173',
	...emailEnvDefaults
};

function createSelectChain(rows: unknown[]) {
	const result = Promise.resolve(rows);
	const chain = {
		from: vi.fn(() => chain),
		where: vi.fn(() => chain),
		limit: vi.fn(() => result),
		then: result.then.bind(result)
	};
	return chain;
}

function createMockMail() {
	const sent: Array<{ to: string; subject: string }> = [];
	const transport: EmailService = {
		isConfigured: true,
		send: vi.fn(async (message) => {
			sent.push({ to: message.to, subject: message.subject });
		}),
		sendSafe(message) {
			void this.send(message);
		}
	};

	const mail: MailService = {
		...createMailService(baseEnv, { select: vi.fn() } as never, transport),
		resolveUserEmail: vi.fn(async (userId: string) => {
			if (userId === 'user-1') return 'user@example.com';
			if (userId === 'maker-1') return 'maker@example.com';
			return null;
		}),
		resolveUserEmails: vi.fn(async () => new Map())
	};

	return { mail, sent, transport };
}

describe('chat-message-notifications', () => {
	afterEach(() => {
		clearPrintChatMessageEmailTimers();
		vi.useRealTimers();
	});

	it('debounces recipient email until the quiet period ends', async () => {
		vi.useFakeTimers();
		const { mail, sent } = createMockMail();
		const printSelect = createSelectChain([
			{ userId: 'user-1', creatorId: 'maker-1' }
		]);
		const senderSelect = createSelectChain([{ username: 'Ada', email: 'maker@example.com' }]);
		const db = {
			select: vi
				.fn()
				.mockImplementationOnce(() => printSelect)
				.mockImplementationOnce(() => senderSelect)
		} as never;

		schedulePrintChatMessageEmail(
			db,
			mail,
			{
				printRequestId: 'print-1',
				recipientUserId: 'user-1',
				senderUserId: 'maker-1'
			},
			{ debounceMs: 1_000 }
		);

		await vi.advanceTimersByTimeAsync(500);
		expect(sent).toEqual([]);

		schedulePrintChatMessageEmail(
			db,
			mail,
			{
				printRequestId: 'print-1',
				recipientUserId: 'user-1',
				senderUserId: 'maker-1'
			},
			{ debounceMs: 1_000 }
		);

		await vi.advanceTimersByTimeAsync(500);
		expect(sent).toEqual([]);

		await vi.advanceTimersByTimeAsync(1_000);
		await Promise.resolve();
		await Promise.resolve();

		expect(sent).toEqual([
			{
				to: 'user@example.com',
				subject: expect.stringContaining('Ada')
			}
		]);
	});

	it('notifies makers when they receive a chat message', async () => {
		vi.useFakeTimers();
		const { mail, sent } = createMockMail();
		const printSelect = createSelectChain([
			{ userId: 'user-1', creatorId: 'maker-1' }
		]);
		const senderSelect = createSelectChain([{ username: 'Jane', email: 'user@example.com' }]);
		const db = {
			select: vi
				.fn()
				.mockImplementationOnce(() => printSelect)
				.mockImplementationOnce(() => senderSelect)
		} as never;

		schedulePrintChatMessageEmail(
			db,
			mail,
			{
				printRequestId: 'print-1',
				recipientUserId: 'maker-1',
				senderUserId: 'user-1'
			},
			{ debounceMs: 10 }
		);

		await vi.advanceTimersByTimeAsync(10);
		await Promise.resolve();
		await Promise.resolve();

		expect(sent).toEqual([
			{
				to: 'maker@example.com',
				subject: expect.stringContaining('Jane')
			}
		]);
	});
});
