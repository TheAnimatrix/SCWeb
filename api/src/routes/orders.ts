import { Hono } from 'hono';
import { requireAuth } from '../middleware/require-auth.js';
import type { OrdersStore } from '../services/orders-store.js';
import type { AppVariables } from '../types/context.js';

export function createOrdersRoutes(
	getOrdersStore: (c: { get: (key: 'ordersStore') => OrdersStore }) => OrdersStore
) {
	const ordersRoutes = new Hono<{ Variables: AppVariables }>();

	ordersRoutes.get('/orders', requireAuth(), async (c) => {
		const userId = c.get('actor').userId!;
		const response = await getOrdersStore(c).listForUser(userId);
		return c.json(response);
	});

	return ordersRoutes;
}
