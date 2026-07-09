import { Hono } from 'hono';
import { createMakersStore, type MakersStore } from '../services/makers-store.js';
import type { AppVariables } from '../types/context.js';

export function createMakersRoutes(
	getMakersStore: (c: { get: (key: 'makersStore') => MakersStore }) => MakersStore
) {
	const routes = new Hono<{ Variables: AppVariables }>();

	routes.get('/makers/available', async (c) => {
		const makers = await getMakersStore(c).listAvailableMakers();
		return c.json({ makers });
	});

	return routes;
}

export const makersRoutes = createMakersRoutes((c) => c.get('makersStore'));
