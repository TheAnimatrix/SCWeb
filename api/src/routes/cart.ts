import { z } from 'zod';
import { Hono } from 'hono';
import { mergeCartBodySchema, upsertCartItemBodySchema } from '../contracts/cart.js';
import { validateJson, validateParam } from '../lib/validation.js';
import { logCartMutation } from '../middleware/logging.js';
import { requireAuth } from '../middleware/require-auth.js';
import { actorType, hasActor, type CartStore } from '../services/cart-store.js';
import type { AppVariables } from '../types/context.js';

const productIdParamSchema = z.object({
	productId: z.string().uuid()
});

export function createCartRoutes(
	getCartStore: (c: { get: (key: 'cartStore') => CartStore }) => CartStore
) {
	const cartRoutes = new Hono<{ Variables: AppVariables }>();

	cartRoutes.get('/cart', async (c) => {
		const actor = c.get('actor');

		if (!hasActor(actor)) {
			return c.json({ error: 'unauthorized', message: 'Actor identity required' }, 401);
		}

		const response = await getCartStore(c).getCart(actor);
		return c.json(response);
	});

	cartRoutes.put(
		'/cart/items/:productId',
		validateParam(productIdParamSchema),
		validateJson(upsertCartItemBodySchema),
		async (c) => {
			const actor = c.get('actor');

			if (!hasActor(actor)) {
				return c.json({ error: 'unauthorized', message: 'Actor identity required' }, 401);
			}

			const { productId } = c.req.valid('param');
			const body = c.req.valid('json');
			const result = await getCartStore(c).upsertCartItem(actor, productId, body);

			if (!result.ok) {
				logCartMutation(c, 'info', 'cart.item.rejected', {
					productId,
					qty: body.qty,
					mode: body.mode,
					actorType: actorType(actor),
					reason: 'insufficient_stock',
					limit: result.body.limit
				});
				return c.json(result.body, result.status);
			}

			const cartId = result.response.cart?.id ?? null;
			logCartMutation(c, 'info', 'cart.item.updated', {
				cartId,
				productId,
				qty: body.qty,
				mode: body.mode,
				actorType: actorType(actor)
			});

			return c.json(result.response);
		}
	);

	cartRoutes.post('/cart/merge', requireAuth(), validateJson(mergeCartBodySchema), async (c) => {
		const actor = c.get('actor');
		const body = c.req.valid('json');
		const result = await getCartStore(c).mergeCart(actor, body.clientId);

		if (!result.ok) {
			logCartMutation(c, 'warn', 'cart.merge.forbidden', {
				actorType: actorType(actor),
				reason: result.body.error
			});
			return c.json(result.body, result.status);
		}

		logCartMutation(c, 'info', 'cart.merge.completed', {
			merged: result.response.merged,
			actorType: actorType(actor)
		});

		return c.json(result.response);
	});

	return cartRoutes;
}

export const cartRoutes = createCartRoutes((c) => c.get('cartStore'));
