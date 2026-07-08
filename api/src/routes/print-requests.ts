import { Hono } from 'hono';
import {
	printRequestActionBodySchema,
	printRequestIdParamSchema
} from '../contracts/print-requests.js';
import { validateJson, validateParam } from '../lib/validation.js';
import { logCheckoutTransition } from '../middleware/logging.js';
import { requireAuth } from '../middleware/require-auth.js';
import type { PrintRequestsStore } from '../services/print-requests-store.js';
import type { AppVariables } from '../types/context.js';

export function createPrintRequestsRoutes(
	getPrintRequestsStore: (c: {
		get: (key: 'printRequestsStore') => PrintRequestsStore;
	}) => PrintRequestsStore
) {
	const printRequestsRoutes = new Hono<{ Variables: AppVariables }>();

	printRequestsRoutes.post(
		'/print-requests/:printRequestId/actions',
		requireAuth(),
		validateParam(printRequestIdParamSchema),
		validateJson(printRequestActionBodySchema),
		async (c) => {
			const actor = c.get('actor');
			const { printRequestId } = c.req.valid('param');
			const body = c.req.valid('json');

			const result = await getPrintRequestsStore(c).performAction(actor, printRequestId, body);

			if (!result.ok) {
				logCheckoutTransition(c, 'warn', 'print-requests.action.rejected', {
					printRequestId,
					action: body.action,
					error: result.body.error,
					status: result.status
				});
				return c.json(result.body, result.status);
			}

			logCheckoutTransition(c, 'info', 'print-requests.action.applied', {
				printRequestId,
				action: body.action,
				requestStage: result.response.requestStage
			});

			return c.json(result.response);
		}
	);

	return printRequestsRoutes;
}
