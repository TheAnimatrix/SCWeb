import { describe, expect, it, vi } from 'vitest';
import { emailEnvDefaults } from '../test/env-defaults.js';
import type { EmailService } from './email.js';
import { createMailService } from './mail.js';

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

describe('createMailService', () => {
	it('sends through the shared transport', async () => {
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

		const db = { select: vi.fn() } as never;
		const mail = createMailService(baseEnv, db, transport);

		mail.send('user@example.com', {
			subject: 'Hello',
			html: '<p>Hi</p>',
			text: 'Hi'
		});

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(sent).toEqual([{ to: 'user@example.com', subject: 'Hello' }]);
	});

	it('logs dispatch failures instead of swallowing them', async () => {
		const transport: EmailService = {
			isConfigured: true,
			send: vi.fn(async () => undefined),
			sendSafe: vi.fn()
		};
		const db = { select: vi.fn() } as never;
		const mail = createMailService(baseEnv, db, transport);

		mail.dispatch('test.event', async () => {
			throw new Error('boom');
		});

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(transport.send).not.toHaveBeenCalled();
	});

	it('resolves user email from the users table', async () => {
		const transport: EmailService = {
			isConfigured: true,
			send: vi.fn(async () => undefined),
			sendSafe: vi.fn()
		};
		const userSelect = createSelectChain([{ email: 'user@example.com' }]);
		const db = {
			select: vi.fn(() => userSelect)
		} as never;
		const mail = createMailService(baseEnv, db, transport);

		await expect(mail.resolveUserEmail('user-1')).resolves.toBe('user@example.com');
	});
});
