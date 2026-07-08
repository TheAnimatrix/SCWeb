import { expect, test } from '@playwright/test';

test.describe('API proxy security', () => {
	test('rejects allowlisted-path SSRF attempts with 404', async ({ request }) => {
		const attacker = await request.get('/api/@attacker.example/');
		expect(attacker.status()).toBe(404);

		const nonexistent = await request.get('/api/nonexistent');
		expect(nonexistent.status()).toBe(404);
	});

	test('rejects disallowed HTTP methods on allowlisted paths', async ({ request }) => {
		const patch = await request.patch('/api/cart');
		expect([404, 405]).toContain(patch.status());

		const options = await request.fetch('/api/cart', { method: 'OPTIONS' });
		expect([404, 405]).toContain(options.status());
	});
});
