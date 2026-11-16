import { Hono } from 'hono';
import { productIdParamSchema } from '../contracts/catalog.js';
import {
	closeInterestBodySchema,
	launchInterestBodySchema,
	showInterestBodySchema
} from '../contracts/interest.js';
import { validateJson, validateParam } from '../lib/validation.js';
import { logCheckoutTransition } from '../middleware/logging.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireCapability, requireMaker, requireStaff } from '../middleware/require-maker.js';
import type { InterestStore } from '../services/interest-store.js';
import type { AppVariables } from '../types/context.js';

type StoreGetter = (c: { get: (key: 'interestStore') => InterestStore }) => InterestStore;

/**
 * Interest checks (contracts/interest.ts): buyer, maker-portal and staff endpoints.
 * Only the staff endpoints return personal data; logs never include addresses or phones.
 */
export function createInterestRoutes(getStore: StoreGetter) {
	const routes = new Hono<{ Variables: AppVariables }>();
	const makerGuards = [
		requireAuth(),
		requireMaker(),
		requireCapability('physical_goods'),
		validateParam(productIdParamSchema)
	] as const;

	// --- Buyers -------------------------------------------------------------

	routes.get(
		'/products/:productId/interest/me',
		requireAuth(),
		validateParam(productIdParamSchema),
		async (c) => {
			const { productId } = c.req.valid('param');
			const userId = c.get('actor').userId!;
			return c.json(await getStore(c).getMyInterest(userId, productId));
		}
	);

	routes.post(
		'/products/:productId/interest',
		requireAuth(),
		validateParam(productIdParamSchema),
		validateJson(showInterestBodySchema),
		async (c) => {
			const { productId } = c.req.valid('param');
			const { address } = c.req.valid('json');
			const userId = c.get('actor').userId!;

			// Snapshot of the account e-mail, used for the launch notice.
			let email = c.get('user')?.email ?? null;
			if (!email) {
				try {
					email = await c.get('mailService').resolveUserEmail(userId);
				} catch {
					email = null;
				}
			}

			const result = await getStore(c).showInterest({ userId, productId, address, email });
			if (!result.ok) {
				logCheckoutTransition(c, 'info', 'interest.join_rejected', {
					productId,
					error: result.body.error
				});
				return c.json(result.body, result.status);
			}
			logCheckoutTransition(c, 'info', 'interest.joined', { productId });
			return c.json(result.response);
		}
	);

	routes.delete(
		'/products/:productId/interest',
		requireAuth(),
		validateParam(productIdParamSchema),
		async (c) => {
			const { productId } = c.req.valid('param');
			const userId = c.get('actor').userId!;
			const result = await getStore(c).withdrawInterest(userId, productId);
			if (!result.ok) return c.json(result.body, result.status);
			logCheckoutTransition(c, 'info', 'interest.withdrawn', { productId });
			return c.json(result.response);
		}
	);

	// --- Maker portal (counts only) ---------------------------------------

	routes.get('/makers/me/listings/:productId/interest', ...makerGuards, async (c) => {
		const { productId } = c.req.valid('param');
		const result = await getStore(c).getMakerSummary(c.get('actor').userId!, productId);
		if (!result.ok) return c.json(result.body, result.status);
		return c.json(result.response);
	});

	routes.post(
		'/makers/me/listings/:productId/interest/launch',
		...makerGuards,
		validateJson(launchInterestBodySchema),
		async (c) => {
			const { productId } = c.req.valid('param');
			const body = c.req.valid('json');
			const result = await getStore(c).launch(c.get('actor').userId!, productId, body);
			if (!result.ok) return c.json(result.body, result.status);
			logCheckoutTransition(c, 'info', 'interest.launched', {
				productId,
				notified: result.response.notified,
				pending: result.response.pending
			});
			return c.json(result.response);
		}
	);

	routes.post(
		'/makers/me/listings/:productId/interest/close',
		...makerGuards,
		validateJson(closeInterestBodySchema),
		async (c) => {
			const { productId } = c.req.valid('param');
			const body = c.req.valid('json');
			const result = await getStore(c).close(c.get('actor').userId!, productId, body);
			if (!result.ok) return c.json(result.body, result.status);
			logCheckoutTransition(c, 'info', 'interest.closed', {
				productId,
				notified: result.response.notified,
				pending: result.response.pending
			});
			return c.json(result.response);
		}
	);

	// --- Staff (full details) ---------------------------------------------

	routes.get('/admin/interest', requireAuth(), requireStaff(), async (c) => {
		return c.json(await getStore(c).adminListCampaigns());
	});

	routes.get(
		'/admin/interest/:productId',
		requireAuth(),
		requireStaff(),
		validateParam(productIdParamSchema),
		async (c) => {
			const { productId } = c.req.valid('param');
			const list = await getStore(c).adminGetCampaign(productId);
			if (!list) {
				return c.json(
					{ error: 'not_an_interest_listing', message: 'This listing is not an interest check.' },
					404
				);
			}
			return c.json(list);
		}
	);

	return routes;
}

export const interestRoutes = createInterestRoutes((c) => c.get('interestStore'));
