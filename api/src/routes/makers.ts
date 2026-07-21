import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
	makerApplicationSchema,
	reviewApplicationBodySchema,
	reviewListingBodySchema,
	updateStockBodySchema,
	updateStorefrontBodySchema,
	upsertListingBodySchema
} from '../contracts/makers.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMaker, requireStaff } from '../middleware/require-maker.js';
import type { MakersStore } from '../services/makers-store.js';
import type { AppVariables } from '../types/context.js';

export function createMakersRoutes(
	getMakersStore: (c: { get: (key: 'makersStore') => MakersStore }) => MakersStore
) {
	const routes = new Hono<{ Variables: AppVariables }>();

	routes.get('/makers/available', async (c) => {
		const makers = await getMakersStore(c).listAvailableMakers();
		return c.json({ makers });
	});

	routes.get('/makers/me', requireAuth(), async (c) => {
		const userId = c.get('actor').userId!;
		const maker = await getMakersStore(c).resolveMaker(userId);
		return c.json({ maker });
	});

	routes.post(
		'/makers/apply',
		requireAuth(),
		zValidator('json', makerApplicationSchema),
		async (c) => {
			const userId = c.get('actor').userId!;
			const body = c.req.valid('json');
			try {
				const application = await getMakersStore(c).submitApplication({
					userId,
					displayName: body.display_name,
					bio: body.bio,
					city: body.city,
					capabilities: body.capabilities
				});
				return c.json({ application }, 201);
			} catch (error) {
				const status = (error as { status?: number }).status ?? 500;
				const message = error instanceof Error ? error.message : 'Application failed';
				return c.json({ error: 'apply_failed', message }, status as 400);
			}
		}
	);

	routes.get('/makers/storefront/:handle', async (c) => {
		const handle = c.req.param('handle');
		const storefront = await getMakersStore(c).getPublicStorefront(handle);
		if (!storefront) {
			return c.json({ error: 'not_found', message: 'Storefront not found' }, 404);
		}
		return c.json({ storefront });
	});

	routes.get('/makers/storefronts', async (c) => {
		const storefronts = await getMakersStore(c).listLiveStorefrontHandles();
		return c.json({ storefronts });
	});

	routes.patch(
		'/makers/me/storefront',
		requireAuth(),
		requireMaker(),
		zValidator('json', updateStorefrontBodySchema),
		async (c) => {
			const userId = c.get('actor').userId!;
			const body = c.req.valid('json');
			const maker = await getMakersStore(c).updateStorefront(userId, body);
			return c.json({ maker });
		}
	);

	routes.get('/makers/me/listings', requireAuth(), requireMaker(), async (c) => {
		const userId = c.get('actor').userId!;
		const listings = await getMakersStore(c).listMakerListings(userId);
		return c.json({ listings });
	});

	routes.post(
		'/makers/me/listings',
		requireAuth(),
		requireMaker(),
		zValidator('json', upsertListingBodySchema),
		async (c) => {
			const userId = c.get('actor').userId!;
			const maker = c.get('maker');
			const body = c.req.valid('json');
			try {
				const listing = await getMakersStore(c).upsertListing({
					makerId: userId,
					username: maker?.username ?? null,
					productId: body.product_id,
					name: body.name,
					priceNew: body.price_new,
					priceOld: body.price_old,
					stockCount: body.stock_count,
					stockStatus: body.stock_status,
					type: body.type,
					images: body.images,
					submitForReview: body.submit_for_review
				});
				return c.json({ listing }, body.product_id ? 200 : 201);
			} catch (error) {
				const status = (error as { status?: number }).status ?? 500;
				const message = error instanceof Error ? error.message : 'Listing save failed';
				return c.json({ error: 'listing_failed', message }, status as 400);
			}
		}
	);

	routes.patch(
		'/makers/me/listings/:productId/stock',
		requireAuth(),
		requireMaker(),
		zValidator('json', updateStockBodySchema),
		async (c) => {
			const userId = c.get('actor').userId!;
			const productId = c.req.param('productId');
			const body = c.req.valid('json');
			try {
				const listing = await getMakersStore(c).setListingStock(
					userId,
					productId,
					body.stock_count
				);
				return c.json({ listing });
			} catch (error) {
				const status = (error as { status?: number }).status ?? 500;
				const message = error instanceof Error ? error.message : 'Stock update failed';
				return c.json({ error: 'stock_failed', message }, status as 400);
			}
		}
	);

	routes.get('/admin/makers/applications', requireAuth(), requireStaff(), async (c) => {
		const applications = await getMakersStore(c).listPendingApplications();
		return c.json({ applications });
	});

	routes.post(
		'/admin/makers/applications/:id/review',
		requireAuth(),
		requireStaff(),
		zValidator('json', reviewApplicationBodySchema),
		async (c) => {
			const reviewerId = c.get('actor').userId!;
			const applicationId = c.req.param('id');
			const body = c.req.valid('json');
			try {
				await getMakersStore(c).reviewApplication({
					applicationId,
					reviewerId,
					decision: body.decision,
					notes: body.notes
				});
				return c.json({ ok: true });
			} catch (error) {
				const status = (error as { status?: number }).status ?? 500;
				const message = error instanceof Error ? error.message : 'Review failed';
				return c.json({ error: 'review_failed', message }, status as 400);
			}
		}
	);

	routes.get('/admin/listings/pending', requireAuth(), requireStaff(), async (c) => {
		const listings = await getMakersStore(c).listPendingListings();
		return c.json({ listings });
	});

	routes.post(
		'/admin/listings/:productId/review',
		requireAuth(),
		requireStaff(),
		zValidator('json', reviewListingBodySchema),
		async (c) => {
			const reviewerId = c.get('actor').userId!;
			const productId = c.req.param('productId');
			const body = c.req.valid('json');
			try {
				const listing = await getMakersStore(c).setListingState(
					productId,
					body.decision,
					reviewerId,
					body.notes
				);
				return c.json({ listing });
			} catch (error) {
				const status = (error as { status?: number }).status ?? 500;
				const message = error instanceof Error ? error.message : 'Review failed';
				return c.json({ error: 'review_failed', message }, status as 400);
			}
		}
	);

	return routes;
}

export const makersRoutes = createMakersRoutes((c) => c.get('makersStore'));
