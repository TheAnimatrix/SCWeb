import { describe, expect, it, vi } from 'vitest';
import { emailEnvDefaults } from '../test/env-defaults.js';
import { createEmailService } from './email.js';

describe('createEmailService', () => {
	it('no-ops when SMTP is not configured', async () => {
		const service = createEmailService({
			NODE_ENV: 'test',
			API_PORT: 3001,
			DATABASE_URL: 'postgresql://test',
			SUPABASE_URL: 'https://example.supabase.co',
			SUPABASE_ANON_KEY: 'anon',
			API_CORS_ORIGINS: 'http://localhost:5173',
			CLIENT_ID_COOKIE_NAME: 'clientId',
			RATE_LIMIT_WINDOW_MS: 60_000,
			RATE_LIMIT_MAX_REQUESTS: 120,
			...emailEnvDefaults
		});

		expect(service.isConfigured).toBe(false);
		await expect(
			service.send({
				to: 'user@example.com',
				subject: 'Test',
				html: '<p>Hi</p>',
				text: 'Hi'
			})
		).resolves.toBeUndefined();
	});

	it('sendSafe swallows send errors', async () => {
		const sendMail = vi.fn(async () => {
			throw new Error('smtp down');
		});
		const nodemailerModule = await import('nodemailer');
		const createTransport = vi.spyOn(nodemailerModule.default, 'createTransport');
		createTransport.mockReturnValue({
			sendMail,
			close: vi.fn()
		} as never);

		const service = createEmailService(
			{
				NODE_ENV: 'test',
				API_PORT: 3001,
				DATABASE_URL: 'postgresql://test',
				SUPABASE_URL: 'https://example.supabase.co',
				SUPABASE_ANON_KEY: 'anon',
				API_CORS_ORIGINS: 'http://localhost:5173',
				CLIENT_ID_COOKIE_NAME: 'clientId',
				RATE_LIMIT_WINDOW_MS: 60_000,
				RATE_LIMIT_MAX_REQUESTS: 120,
				SMTP_HOST: 'smtp.example.com',
				SMTP_PORT: 465,
				SMTP_USER: 'user',
				SMTP_PASS: 'pass',
				SMTP_SECURE: false,
				EMAIL_FROM: 'Selfcrafted <noreply@selfcrafted.in>',
				ORDERS_INBOX_EMAIL: 'orders@selfcrafted.in'
			},
			{ minSendIntervalMs: 0 }
		);

		expect(service.isConfigured).toBe(true);

		service.sendSafe({
			to: 'user@example.com',
			subject: 'Test',
			html: '<p>Hi</p>',
			text: 'Hi'
		});

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(sendMail).toHaveBeenCalled();
		createTransport.mockRestore();
	});

	it('retries once when the SMTP provider rate limits', async () => {
		let attempts = 0;
		const sendMail = vi.fn(async () => {
			attempts += 1;
			if (attempts === 1) {
				throw new Error(
					'Message failed: 550 Too many requests. You can only make 2 requests per second.'
				);
			}
		});

		const nodemailerModule = await import('nodemailer');
		const createTransport = vi.spyOn(nodemailerModule.default, 'createTransport');
		createTransport.mockReturnValue({
			sendMail,
			close: vi.fn()
		} as never);

		const service = createEmailService(
			{
				NODE_ENV: 'production',
				API_PORT: 3001,
				DATABASE_URL: 'postgresql://test',
				SUPABASE_URL: 'https://example.supabase.co',
				SUPABASE_ANON_KEY: 'anon',
				API_CORS_ORIGINS: 'http://localhost:5173',
				CLIENT_ID_COOKIE_NAME: 'clientId',
				RATE_LIMIT_WINDOW_MS: 60_000,
				RATE_LIMIT_MAX_REQUESTS: 120,
				SMTP_HOST: 'smtp.example.com',
				SMTP_PORT: 465,
				SMTP_USER: 'user',
				SMTP_PASS: 'pass',
				SMTP_SECURE: false,
				EMAIL_FROM: 'Selfcrafted <noreply@selfcrafted.in>',
				ORDERS_INBOX_EMAIL: 'orders@selfcrafted.in'
			},
			{ minSendIntervalMs: 0 }
		);

		vi.useFakeTimers();
		const sendPromise = service.send({
			to: 'user@example.com',
			subject: 'Test',
			html: '<p>Hi</p>',
			text: 'Hi'
		});
		await vi.runAllTimersAsync();
		await sendPromise;

		expect(sendMail).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
		createTransport.mockRestore();
	});
});
