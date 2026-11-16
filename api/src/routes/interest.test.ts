import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../env.js';
import type { InterestStore } from '../services/interest-store.js';
import type { MailService } from '../services/mail.js';
import type { MakersStore } from '../services/makers-store.js';
import type { Actor, AppVariables, ResolvedMaker } from '../types/context.js';
import { createInterestRoutes } from './interest.js';

const STAFF = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const BUYER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const MAKER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PRODUCT = '11111111-1111-4111-8111-111111111111';

const ADDRESS = {
	name: 'Asha Rao',
	line1: '12 Lake Road',
	city: 'Bengaluru',
	state: 'Karnataka',
	pincode: '560001',
	phone: '98765 43210'
};

function fakeStore(overrides: Partial<InterestStore> = {}): InterestStore {
	return {
		getMyInterest: vi.fn(async () => ({ interested: false, since: null })),
		showInterest: vi.fn(async () => ({
			ok: true as const,
			response: { interested: true, interestedCount: 1 }
		})),
		withdrawInterest: vi.fn(),
		getMakerSummary: vi.fn(),
		launch: vi.fn(),
		close: vi.fn(),
		adminListCampaigns: vi.fn(async () => ({ campaigns: [] })),
		adminGetCampaign: vi.fn(async () => null),
		...overrides
	} as InterestStore;
}

function createTestApp(
	actor: Actor,
	store: InterestStore,
	maker: Partial<ResolvedMaker> | null = null
) {
	const app = new Hono<{ Variables: AppVariables }>();
	app.use('*', async (c, next) => {
		c.set('env', { STAFF_USER_IDS: STAFF } as Env);
		c.set('actor', actor);
		c.set('user', null);
		c.set('requestId', 'test');
		c.set('interestStore', store);
		c.set('mailService', {
			resolveUserEmail: async () => 'buyer@example.test'
		} as unknown as MailService);
		c.set('makersStore', {
			resolveMaker: async () => maker
		} as unknown as MakersStore);
		await next();
	});
	app.route(
		'/',
		createInterestRoutes((c) => c.get('interestStore'))
	);
	return app;
}

function postJson(body: unknown) {
	return {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	};
}

describe('interest routes', () => {
	it('requires sign-in to show interest', async () => {
		const store = fakeStore();
		const app = createTestApp({ userId: null, clientId: 'guest' }, store);
		const response = await app.request(
			`/products/${PRODUCT}/interest`,
			postJson({ address: ADDRESS })
		);
		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toMatchObject({ error: 'unauthorized' });
		expect(store.showInterest).not.toHaveBeenCalled();
	});

	it('normalises the phone and snapshots the account e-mail', async () => {
		const store = fakeStore();
		const app = createTestApp({ userId: BUYER, clientId: null }, store);
		const response = await app.request(
			`/products/${PRODUCT}/interest`,
			postJson({ address: ADDRESS })
		);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ interested: true, interestedCount: 1 });
		expect(store.showInterest).toHaveBeenCalledWith({
			userId: BUYER,
			productId: PRODUCT,
			address: expect.objectContaining({ phone: '+919876543210' }),
			email: 'buyer@example.test'
		});
	});

	it('rejects an invalid address with invalid_payload', async () => {
		const store = fakeStore();
		const app = createTestApp({ userId: BUYER, clientId: null }, store);
		const response = await app.request(
			`/products/${PRODUCT}/interest`,
			postJson({ address: { ...ADDRESS, phone: '12345' } })
		);
		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({ error: 'invalid_payload' });
		expect(store.showInterest).not.toHaveBeenCalled();
	});

	it('passes store errors through with their status', async () => {
		const store = fakeStore({
			showInterest: vi.fn(async () => ({
				ok: false as const,
				status: 409 as const,
				body: { error: 'own_listing' as const, message: 'own' }
			}))
		});
		const app = createTestApp({ userId: BUYER, clientId: null }, store);
		const response = await app.request(
			`/products/${PRODUCT}/interest`,
			postJson({ address: ADDRESS })
		);
		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toMatchObject({ error: 'own_listing' });
	});

	it('keeps the staff endpoints behind requireStaff', async () => {
		const store = fakeStore();
		const guest = await createTestApp({ userId: null, clientId: 'g' }, store).request(
			'/admin/interest'
		);
		expect(guest.status).toBe(401);

		const buyerApp = createTestApp({ userId: BUYER, clientId: null }, store);
		expect((await buyerApp.request('/admin/interest')).status).toBe(403);
		expect((await buyerApp.request(`/admin/interest/${PRODUCT}`)).status).toBe(403);
		expect(store.adminListCampaigns).not.toHaveBeenCalled();
		expect(store.adminGetCampaign).not.toHaveBeenCalled();

		const staffApp = createTestApp({ userId: STAFF, clientId: null }, store);
		const list = await staffApp.request('/admin/interest');
		expect(list.status).toBe(200);
		await expect(list.json()).resolves.toEqual({ campaigns: [] });
		expect((await staffApp.request(`/admin/interest/${PRODUCT}`)).status).toBe(404);
	});

	it('keeps maker endpoints behind the approved-maker capability check', async () => {
		const store = fakeStore({
			launch: vi.fn(async () => ({
				ok: true as const,
				response: { status: 'launched' as const, notified: 2, pending: 0 }
			}))
		});
		const path = `/makers/me/listings/${PRODUCT}/interest/launch`;

		const notMaker = await createTestApp({ userId: BUYER, clientId: null }, store).request(
			path,
			postJson({ stock_count: 5 })
		);
		expect(notMaker.status).toBe(403);
		expect(store.launch).not.toHaveBeenCalled();

		const maker = {
			id: MAKER,
			approved_state: 'approved',
			capabilities: ['physical_goods' as const]
		};
		const ok = await createTestApp({ userId: MAKER, clientId: null }, store, maker).request(
			path,
			postJson({ stock_count: 5, message: 'Ready' })
		);
		expect(ok.status).toBe(200);
		await expect(ok.json()).resolves.toEqual({ status: 'launched', notified: 2, pending: 0 });
		expect(store.launch).toHaveBeenCalledWith(MAKER, PRODUCT, {
			stock_count: 5,
			message: 'Ready'
		});
	});
});
