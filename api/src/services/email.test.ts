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

	it('sendSafe swallows send errors', () => {
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
			SMTP_HOST: 'smtp.example.com',
			SMTP_PORT: 465,
			SMTP_USER: 'user',
			SMTP_PASS: 'pass',
			SMTP_SECURE: false,
			EMAIL_FROM: 'Selfcrafted <noreply@selfcrafted.in>'
		});

		expect(service.isConfigured).toBe(true);

		const sendSpy = vi.spyOn(service, 'send').mockRejectedValue(new Error('smtp down'));
		service.sendSafe({
			to: 'user@example.com',
			subject: 'Test',
			html: '<p>Hi</p>',
			text: 'Hi'
		});

		expect(sendSpy).toHaveBeenCalled();
	});
});
