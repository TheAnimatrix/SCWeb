import { Hono } from 'hono';
import {
	browseQuerySchema,
	constantKeyParamSchema,
	productIdParamSchema
} from '../contracts/catalog.js';
import { validateParam, validateQuery } from '../lib/validation.js';
import { createCatalogStore, normalizeBrowseTagParam, type CatalogStore } from '../services/catalog-store.js';
import type { AppVariables } from '../types/context.js';

export function createCatalogRoutes(
	getCatalogStore: (c: { get: (key: 'catalogStore') => CatalogStore }) => CatalogStore
) {
	const routes = new Hono<{ Variables: AppVariables }>();

	routes.get('/constants/:key', validateParam(constantKeyParamSchema), async (c) => {
		const { key } = c.req.valid('param');
		const result = await getCatalogStore(c).getConstant(key);
		if (!result) {
			return c.json({ error: 'not_found', message: 'Constant not found' }, 404);
		}
		return c.json(result);
	});

	routes.get('/catalog/home', async (c) => {
		return c.json(await getCatalogStore(c).getHomeCatalog());
	});

	routes.get('/catalog/browse', validateQuery(browseQuerySchema), async (c) => {
		const query = c.req.valid('query');
		const filters = {
			...query,
			tag: normalizeBrowseTagParam(query.tag) ?? undefined
		};
		return c.json(await getCatalogStore(c).getBrowseCatalog(filters));
	});

	routes.get('/products/:productId', validateParam(productIdParamSchema), async (c) => {
		const { productId } = c.req.valid('param');
		const result = await getCatalogStore(c).getProduct(productId);
		if (!result) {
			return c.json({ error: 'not_found', message: 'Product not found' }, 404);
		}
		return c.json(result);
	});

	routes.get('/products/:productId/reviews', validateParam(productIdParamSchema), async (c) => {
		const { productId } = c.req.valid('param');
		return c.json(await getCatalogStore(c).getProductReviews(productId));
	});

	routes.get('/products/:productId/variants', validateParam(productIdParamSchema), async (c) => {
		const { productId } = c.req.valid('param');
		const result = await getCatalogStore(c).getProductVariants(productId);
		if (!result) {
			return c.json({ error: 'not_found', message: 'Product not found' }, 404);
		}
		return c.json(result);
	});

	routes.get('/products/:productId/related', validateParam(productIdParamSchema), async (c) => {
		const { productId } = c.req.valid('param');
		const result = await getCatalogStore(c).getRelatedProducts(productId);
		if (!result) {
			return c.json({ error: 'not_found', message: 'Product not found' }, 404);
		}
		return c.json(result);
	});

	return routes;
}

export const catalogRoutes = createCatalogRoutes((c) => c.get('catalogStore'));
