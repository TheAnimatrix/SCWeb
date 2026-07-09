import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { createMakersRoutes } from './makers.js';
import type { MakersStore } from '../services/makers-store.js';
import type { AppVariables } from '../types/context.js';

function createTestApp(makersStore: MakersStore) {
	const app = new Hono<{ Variables: AppVariables }>();
	app.use('*', async (c, next) => {
		c.set('makersStore', makersStore);
		await next();
	});
	app.route('/', createMakersRoutes((c) => c.get('makersStore')));
	return app;
}

describe('makers routes', () => {
	it('returns available makers', async () => {
		const makersStore = {
			listAvailableMakers: vi.fn().mockResolvedValue([
				{
					maker_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
					crafter_name: 'Maker One',
					approved_state: 'approved',
					avg_quote_time: null,
					avg_rating: null,
					completed_orders: 0,
					contact_number: null,
					price_rank: 3,
					delivery_rank: 3,
					email: null,
					filaments: [{ color: '#ffffff', material_type: 'PLA' }],
					reviews: [],
					max_printer_size: null,
					number_of_printers: 1,
					tier: 'Bee'
				}
			])
		} satisfies MakersStore;

		const app = createTestApp(makersStore);
		const response = await app.request('http://localhost/makers/available');

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			makers: [
				expect.objectContaining({
					crafter_name: 'Maker One',
					filaments: [{ color: '#ffffff', material_type: 'PLA' }]
				})
			]
		});
	});
});
