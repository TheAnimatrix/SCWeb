import { describe, expect, it, vi } from 'vitest';
import { emailEnvDefaults } from '../test/env-defaults.js';
import type { EmailService } from './email.js';
import {
	getOrdersInboxEmail,
	notifyOrderReceived,
	notifyPrintMessageReceived,
	notifyPrintQuoteRequested,
	notifyPrintStatusUpdate
} from './order-notifications.js';

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

function createMockEmailService() {
	const sent: Array<{ to: string; subject: string }> = [];
	const emailService: EmailService = {
		isConfigured: true,
		send: vi.fn(async (message) => {
			sent.push({ to: message.to, subject: message.subject });
		}),
		sendSafe(message) {
			void this.send(message);
		}
	};

	return { emailService, sent };
}

function createSelectChain(rows: unknown[]) {
	const result = Promise.resolve(rows);
	const chain = {
		from: vi.fn(() => chain),
		leftJoin: vi.fn(() => chain),
		innerJoin: vi.fn(() => chain),
		where: vi.fn(() => chain),
		limit: vi.fn(() => result),
		then: result.then.bind(result)
	};
	return chain;
}

describe('order-notifications', () => {
	it('uses orders inbox default', () => {
		expect(getOrdersInboxEmail(baseEnv)).toBe('orders@selfcrafted.in');
	});

	it('notifies inbox, customer, and makers on order placed', async () => {
		const { emailService, sent } = createMockEmailService();
		const orderSelect = createSelectChain([
			{
				id: 'order-1',
				userId: 'user-1',
				address: {
					shipping: { name: 'Jane', email: 'jane@example.com' },
					billing: { name: 'Jane', email: 'jane@example.com' }
				},
				subtotalPaise: 100_00,
				deliveryFeePaise: 0,
				totalPaise: 100_00
			}
		]);
		const recipientSelect = createSelectChain([{ email: 'jane@example.com' }]);
		const lineSelect = createSelectChain([
			{
				qty: 1,
				productName: 'Widget',
				unitPricePaise: 100_00,
				productUid: 'maker-1'
			}
		]);
		const makerSelect = createSelectChain([
			{ id: 'maker-1', email: 'maker@example.com' }
		]);

		const db = {
			select: vi
				.fn()
				.mockImplementationOnce(() => orderSelect)
				.mockImplementationOnce(() => recipientSelect)
				.mockImplementationOnce(() => lineSelect)
				.mockImplementationOnce(() => makerSelect)
		} as never;

		notifyOrderReceived(db, emailService, baseEnv, 'order-1');
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(sent.map((entry) => entry.to).sort()).toEqual([
			'jane@example.com',
			'maker@example.com',
			'orders@selfcrafted.in'
		]);
	});

	it('notifies inbox, user, and maker on print quote requested', async () => {
		const { emailService, sent } = createMockEmailService();
		const userSelect = createSelectChain([
			{ id: 'user-1', email: 'user@example.com' },
			{ id: 'maker-1', email: 'maker@example.com' }
		]);
		const db = {
			select: vi.fn(() => userSelect)
		} as never;

		notifyPrintQuoteRequested(db, emailService, baseEnv, 'print-1', {
			userId: 'user-1',
			creatorId: 'maker-1'
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(sent.map((entry) => entry.to).sort()).toEqual([
			'maker@example.com',
			'orders@selfcrafted.in',
			'user@example.com'
		]);
	});

	it('notifies inbox, user, and maker on print status update', async () => {
		const { emailService, sent } = createMockEmailService();
		const userSelect = createSelectChain([
			{ id: 'user-1', email: 'user@example.com' },
			{ id: 'maker-1', email: 'maker@example.com' }
		]);
		const db = {
			select: vi.fn(() => userSelect)
		} as never;

		notifyPrintStatusUpdate(db, emailService, baseEnv, 'print-1', {
			userId: 'user-1',
			creatorId: 'maker-1'
		}, {
			action: 'quote',
			amountInr: 500
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(sent.map((entry) => entry.to).sort()).toEqual([
			'maker@example.com',
			'orders@selfcrafted.in',
			'user@example.com'
		]);
	});

	it('notifies only the customer user for print chat messages', async () => {
		const { emailService, sent } = createMockEmailService();
		const printSelect = createSelectChain([{ userId: 'user-1' }]);
		const userSelect = createSelectChain([{ email: 'user@example.com' }]);
		const db = {
			select: vi
				.fn()
				.mockImplementationOnce(() => printSelect)
				.mockImplementationOnce(() => userSelect)
		} as never;

		notifyPrintMessageReceived(
			db,
			emailService,
			baseEnv,
			'print-1',
			'user-1',
			'Can you use blue filament?'
		);
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(sent).toEqual([
			{
				to: 'user@example.com',
				subject: expect.stringContaining('New message')
			}
		]);
	});

	it('skips print chat email when recipient is the maker', async () => {
		const { emailService, sent } = createMockEmailService();
		const printSelect = createSelectChain([{ userId: 'user-1' }]);
		const db = {
			select: vi.fn(() => printSelect)
		} as never;

		notifyPrintMessageReceived(
			db,
			emailService,
			baseEnv,
			'print-1',
			'maker-1',
			'On my way'
		);
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(sent).toEqual([]);
	});
});
