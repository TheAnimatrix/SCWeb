import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { makerApplicationSchema, upsertListingBodySchema } from '../contracts/makers.js';
import { describeValidationIssue, validateJson, validateQuery } from './validation.js';

function messageFor(schema: z.ZodTypeAny, value: unknown): string {
	const result = schema.safeParse(value);
	if (result.success) throw new Error('expected validation to fail');
	return describeValidationIssue(result.error.issues[0]);
}

const listing = {
	name: 'Desk lamp kit',
	price_new: 1200,
	stock_count: 3
};

describe('describeValidationIssue', () => {
	it('explains a short display name', () => {
		expect(
			messageFor(makerApplicationSchema, { display_name: 'ab', capabilities: ['physical_goods'] })
		).toBe('Display name must be at least 3 characters.');
	});

	it('explains a missing required field', () => {
		expect(messageFor(makerApplicationSchema, { capabilities: ['physical_goods'] })).toBe(
			'Display name is required.'
		);
	});

	it('explains prices that are not whole rupees or are zero', () => {
		expect(messageFor(upsertListingBodySchema, { ...listing, price_new: 499.5 })).toBe(
			'Price must be a whole number.'
		);
		expect(messageFor(upsertListingBodySchema, { ...listing, price_new: 0 })).toBe(
			'Price must be 1 or more.'
		);
		expect(messageFor(upsertListingBodySchema, { ...listing, stock_count: -1 })).toBe(
			'Stock must be 0 or more.'
		);
	});

	it('explains too many images', () => {
		const images = Array.from({ length: 13 }, (_, i) => ({ url: `https://example.com/${i}.jpg` }));
		expect(messageFor(upsertListingBodySchema, { ...listing, images })).toBe(
			'Images can have at most 12 items.'
		);
	});

	it('explains text that is too long', () => {
		expect(
			messageFor(z.object({ tagline: z.string().max(160) }), { tagline: 'x'.repeat(161) })
		).toBe('Tagline must be 160 characters or fewer.');
	});

	it('explains an option outside the allowed list', () => {
		expect(messageFor(z.object({ state: z.enum(['live', 'paused']) }), { state: 'gone' })).toBe(
			'State is not one of the allowed options.'
		);
	});
});

describe('validation middleware', () => {
	const app = new Hono()
		.post('/apply', validateJson(makerApplicationSchema), (c) => c.json({ ok: true }))
		.get('/search', validateQuery(z.object({ page: z.coerce.number().int().min(1) })), (c) =>
			c.json({ ok: true })
		);

	it('returns a plain message with the invalid_payload code', async () => {
		const response = await app.request('http://localhost/apply', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ display_name: 'ab', capabilities: ['physical_goods'] })
		});
		expect(response.status).toBe(400);
		const body = (await response.json()) as Record<string, unknown>;
		expect(body.error).toBe('invalid_payload');
		expect(body.message).toBe('Display name must be at least 3 characters.');
		expect(body.issues).toEqual([{ path: ['display_name'], code: 'too_small' }]);
	});

	it('lets valid input through', async () => {
		const response = await app.request('http://localhost/apply', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ display_name: 'Lamp Works', capabilities: ['physical_goods'] })
		});
		expect(response.status).toBe(200);
	});

	it('uses the same shape for query validation', async () => {
		const response = await app.request('http://localhost/search?page=0');
		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: 'invalid_payload',
			message: 'Page must be 1 or more.'
		});
	});
});
