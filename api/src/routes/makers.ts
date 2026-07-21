import { zValidator } from '@hono/zod-validator';
import { createClient } from '@supabase/supabase-js';
import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import {
	makerApplicationSchema,
	makerListingStateBodySchema,
	reviewApplicationBodySchema,
	reviewListingBodySchema,
	updateListingDetailsBodySchema,
	updateStockBodySchema,
	updateStorefrontBodySchema,
	upsertListingBodySchema
} from '../contracts/makers.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireCapability, requireMaker, requireStaff } from '../middleware/require-maker.js';
import type { MakersStore } from '../services/makers-store.js';
import type { AppVariables } from '../types/context.js';

const IMAGES_BUCKET = 'images';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function extensionForMime(mime: string): string {
	switch (mime) {
		case 'image/png':
			return 'png';
		case 'image/webp':
			return 'webp';
		case 'image/gif':
			return 'gif';
		default:
			return 'jpg';
	}
}

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

	routes.post('/makers/me/assets/upload', requireAuth(), requireMaker(), async (c) => {
		const env = c.get('env');
		if (!env.SUPABASE_SERVICE_ROLE_KEY) {
			return c.json({ error: 'upload_unconfigured', message: 'Storage is not configured' }, 503);
		}

		const userId = c.get('actor').userId!;
		const contentType = c.req.header('content-type') ?? '';
		if (!contentType.includes('multipart/form-data')) {
			return c.json({ error: 'invalid_content_type', message: 'Expected multipart form upload' }, 400);
		}

		let form: FormData;
		try {
			form = await c.req.formData();
		} catch {
			return c.json({ error: 'invalid_body', message: 'Could not read upload body' }, 400);
		}

		const file = form.get('file');
		if (!(file instanceof File)) {
			return c.json({ error: 'missing_file', message: 'file field is required' }, 400);
		}

		const purposeRaw = String(form.get('purpose') ?? 'listing');
		const purpose =
			purposeRaw === 'banner' || purposeRaw === 'avatar' || purposeRaw === 'listing'
				? purposeRaw
				: 'listing';

		if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
			return c.json(
				{ error: 'invalid_type', message: 'Only JPEG, PNG, WebP, and GIF images are allowed' },
				400
			);
		}
		if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
			return c.json(
				{ error: 'invalid_size', message: `Image must be between 1 byte and ${MAX_IMAGE_BYTES} bytes` },
				413
			);
		}

		const bytes = new Uint8Array(await file.arrayBuffer());
		const ext = extensionForMime(file.type);
		const objectKey = `makers/${userId}/${purpose}/${randomUUID()}.${ext}`;

		const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
		const { error } = await client.storage.from(IMAGES_BUCKET).upload(objectKey, bytes, {
			contentType: file.type,
			upsert: false
		});
		if (error) {
			return c.json({ error: 'upload_failed', message: error.message }, 500);
		}

		const { data } = client.storage.from(IMAGES_BUCKET).getPublicUrl(objectKey);
		return c.json({ url: data.publicUrl, path: objectKey, purpose }, 201);
	});

	routes.get(
		'/makers/me/listings',
		requireAuth(),
		requireMaker(),
		requireCapability('physical_goods'),
		async (c) => {
			const userId = c.get('actor').userId!;
			const listings = await getMakersStore(c).listMakerListings(userId);
			return c.json({ listings });
		}
	);

	routes.post(
		'/makers/me/listings',
		requireAuth(),
		requireMaker(),
		requireCapability('physical_goods'),
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
					tags: body.tags,
					guarantee: body.guarantee,
					description: body.description,
					docs: body.docs,
					costing: body.costing,
					shipping: body.shipping,
					documentation: body.documentation,
					faq: body.faq,
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
		requireCapability('physical_goods'),
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

	routes.patch(
		'/makers/me/listings/:productId/details',
		requireAuth(),
		requireMaker(),
		requireCapability('physical_goods'),
		zValidator('json', updateListingDetailsBodySchema),
		async (c) => {
			const userId = c.get('actor').userId!;
			const productId = c.req.param('productId');
			const body = c.req.valid('json');
			try {
				const listing = await getMakersStore(c).setListingDetails(userId, productId, body);
				return c.json({ listing });
			} catch (error) {
				const status = (error as { status?: number }).status ?? 500;
				const message = error instanceof Error ? error.message : 'Details update failed';
				return c.json({ error: 'details_failed', message }, status as 400);
			}
		}
	);

	routes.patch(
		'/makers/me/listings/:productId/state',
		requireAuth(),
		requireMaker(),
		requireCapability('physical_goods'),
		zValidator('json', makerListingStateBodySchema),
		async (c) => {
			const userId = c.get('actor').userId!;
			const productId = c.req.param('productId');
			const body = c.req.valid('json');
			try {
				const listing = await getMakersStore(c).transitionMakerListingState(
					userId,
					productId,
					body.state
				);
				return c.json({ listing });
			} catch (error) {
				const status = (error as { status?: number }).status ?? 500;
				const message = error instanceof Error ? error.message : 'State update failed';
				return c.json({ error: 'state_failed', message }, status as 400);
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
