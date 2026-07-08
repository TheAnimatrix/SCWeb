import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Database } from './db/index.js';
import { getCorsOrigins, type Env } from './env.js';
import { csrfMiddleware } from './middleware/csrf.js';
import { errorHandler } from './middleware/error-handler.js';
import { identityMiddleware } from './middleware/identity.js';
import { loggingMiddleware } from './middleware/logging.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { cartRoutes } from './routes/cart.js';
import { checkoutRoutes } from './routes/checkout.js';
import { healthRoutes } from './routes/health.js';
import { printFilesRoutes } from './routes/print-files.js';
import { createChatsRoutes } from './routes/chats.js';
import { createPrintRequestsRoutes } from './routes/print-requests.js';
import { printPaymentsRoutes } from './routes/print-payments.js';
import { catalogRoutes } from './routes/catalog.js';
import { createChatsStore, type ChatsStore } from './services/chats-store.js';
import {
	createPrintRequestsStore,
	type PrintRequestsStore
} from './services/print-requests-store.js';
import { createCartStore, type CartStore } from './services/cart-store.js';
import { createCheckoutStore, type CheckoutStore } from './services/checkout-store.js';
import {
	createPrintFilesStore,
	createSupabaseStorage,
	isFilesConfigured,
	type PrintFilesStore
} from './services/print-files-store.js';
import {
	createPrintPaymentsStore,
	type PrintPaymentsStore
} from './services/print-payments-store.js';
import { createCatalogStore, type CatalogStore } from './services/catalog-store.js';
import { createRazorpayClient, type RazorpayClient } from './services/razorpay-client.js';
import type { AppVariables } from './types/context.js';

type CreateAppOptions = {
	env: Env;
	db: Database;
	cartStore?: CartStore;
	checkoutStore?: CheckoutStore;
	printFilesStore?: PrintFilesStore | null;
	printPaymentsStore?: PrintPaymentsStore;
	printRequestsStore?: PrintRequestsStore;
	chatsStore?: ChatsStore;
	catalogStore?: CatalogStore;
	razorpayClient?: RazorpayClient;
};

export function createApp({
	env,
	db,
	cartStore,
	checkoutStore,
	printFilesStore,
	printPaymentsStore,
	printRequestsStore,
	chatsStore,
	catalogStore,
	razorpayClient
}: CreateAppOptions) {
	const app = new Hono<{ Variables: AppVariables }>();
	const resolvedCartStore = cartStore ?? createCartStore(db);
	const resolvedRazorpayClient =
		razorpayClient ??
		(env.PUBLIC_RAZORPAY_ID && env.RAZORPAY_KEY ? createRazorpayClient(env) : null);
	const resolvedCheckoutStore =
		checkoutStore ??
		(resolvedRazorpayClient
			? createCheckoutStore(db, resolvedRazorpayClient)
			: createCheckoutStore(db, {
					async createOrder() {
						throw new Error('Razorpay client is not configured');
					}
				}));
	const resolvedPrintFilesStore =
		printFilesStore === undefined
			? isFilesConfigured(env)
				? createPrintFilesStore(db, createSupabaseStorage(env))
				: null
			: printFilesStore;
	const resolvedPrintPaymentsStore =
		printPaymentsStore ??
		createPrintPaymentsStore(
			db,
			resolvedRazorpayClient ?? {
				async createOrder() {
					throw new Error('Razorpay client is not configured');
				}
			}
		);
	const resolvedPrintRequestsStore = printRequestsStore ?? createPrintRequestsStore(db);
	const resolvedChatsStore = chatsStore ?? createChatsStore(db);
	const resolvedCatalogStore = catalogStore ?? createCatalogStore(db);

	app.use('*', async (c, next) => {
		c.set('env', env);
		c.set('db', db);
		c.set('cartStore', resolvedCartStore);
		c.set('checkoutStore', resolvedCheckoutStore);
		c.set('printFilesStore', resolvedPrintFilesStore);
		c.set('printPaymentsStore', resolvedPrintPaymentsStore);
		c.set('printRequestsStore', resolvedPrintRequestsStore);
		c.set('chatsStore', resolvedChatsStore);
		c.set('catalogStore', resolvedCatalogStore);
		await next();
	});

	app.use(
		'*',
		cors({
			origin: getCorsOrigins(env),
			allowHeaders: ['Authorization', 'Content-Type', 'X-Request-Id', 'Cookie'],
			allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			credentials: true
		})
	);

	app.use('*', requestIdMiddleware());
	app.use('*', identityMiddleware());
	app.use('*', loggingMiddleware());
	app.use('*', rateLimitMiddleware());
	app.use('*', csrfMiddleware());

	app.route('/', healthRoutes);
	app.route('/', catalogRoutes);
	app.route('/', cartRoutes);
	app.route('/', checkoutRoutes);
	app.route('/', printFilesRoutes);
	app.route('/', printPaymentsRoutes);
	app.route(
		'/',
		createPrintRequestsRoutes((c) => c.get('printRequestsStore'))
	);
	app.route(
		'/',
		createChatsRoutes((c) => c.get('chatsStore'))
	);

	app.onError(errorHandler);

	app.notFound((c) => c.json({ error: 'not_found', message: 'Route not found' }, 404));

	return app;
}

export type AppType = ReturnType<typeof createApp>;
