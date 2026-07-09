import type { ListUserOrdersResponse, UserOrderView } from '@scweb/api/contracts';
import { paiseToRupees } from '@scweb/api/contracts';
import type { Orders } from '$lib/types/product';
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

const API_ORIGIN = env.API_ORIGIN ?? 'http://localhost:3001';

const PRINT_HISTORY_STAGES = ['paid', 'shipped', 'completed', 'paid_externally'] as const;

function mapOrderStatus(status: string): string {
	switch (status) {
		case 'paid':
		case 'fulfilled':
		case 'shipped':
			return 'completed';
		case 'payment_pending':
			return 'pending';
		case 'failed':
		case 'cancelled':
		case 'refunded':
			return 'failed';
		default:
			return status;
	}
}

function mapApiOrderToProfile(order: UserOrderView): Orders[number] {
	return {
		created_at: order.createdAt,
		payment_status: mapOrderStatus(order.status),
		payment_method: 'Razorpay',
		payment_id: order.providerPaymentId,
		billing_address: JSON.stringify(order.address.billing),
		shipping_address: JSON.stringify(order.address.shipping),
		trackingId: null,
		trackingCourier: null,
		trackingUrl: null,
		uid: '',
		id: order.id,
		amount: paiseToRupees(order.totalPaise),
		cart_id: order.cartId,
		item_snapshot: order.items.map((item) => ({
			product_id: item.productId,
			product_name: item.productName,
			qty: item.qty,
			price: paiseToRupees(item.unitPricePaise),
			author: item.author,
			authorTier: item.authorTier
		}))
	};
}

function printOrderAmount(events: unknown): number {
	if (!Array.isArray(events)) return 0;

	for (const event of events) {
		if (typeof event !== 'object' || event === null) continue;
		const record = event as { type?: string; extra?: Record<string, unknown> };
		if (record.type !== 'paid' && record.type !== 'order_created') continue;
		const extra = record.extra;
		if (!extra) continue;
		if (typeof extra.amount_paise === 'number') return paiseToRupees(extra.amount_paise);
		if (typeof extra.amount === 'number') return extra.amount;
		if (typeof extra.amount === 'string') {
			const parsed = Number(extra.amount);
			if (Number.isFinite(parsed)) {
				return parsed >= 10000 ? paiseToRupees(parsed) : parsed;
			}
		}
	}

	return 0;
}

function mapPrintRequestToProfileOrder(row: {
	id: string;
	created_at: string;
	request_stage: string | null;
	events: unknown;
	address: unknown;
}): Orders[number] {
	const address =
		typeof row.address === 'object' && row.address !== null && !Array.isArray(row.address)
			? (row.address as { shipping?: unknown; billing?: unknown })
			: {};

	return {
		created_at: row.created_at,
		payment_status: 'completed',
		payment_method: 'razorpay:PrintRequest',
		payment_id: null,
		billing_address: JSON.stringify(address.billing ?? {}),
		shipping_address: JSON.stringify(address.shipping ?? {}),
		trackingId: null,
		trackingCourier: null,
		trackingUrl: null,
		uid: '',
		id: row.id,
		amount: printOrderAmount(row.events),
		cart_id: row.id,
		item_snapshot: []
	};
}

type ArchivedPurchaseRow = {
	id: number;
	created_at: string;
	payment_status: string | null;
	payment_method: string | null;
	amount: number | null;
	cart_id: string | null;
	billing_address: unknown;
	shipping_address: unknown;
	trackingId: string | null;
	trackingCourier: string | null;
	trackingUrl: string | null;
	payment_id_b: string | null;
	item_snapshot: unknown;
};

function stringifyAddress(value: unknown): string {
	if (typeof value === 'string') return value;
	return JSON.stringify(value ?? {});
}

type LegacyCartLine = {
	product_id: string;
	qty: number;
	price: number;
};

function parseLegacyCartList(list: unknown): LegacyCartLine[] {
	if (!Array.isArray(list)) return [];

	return list.flatMap((entry) => {
		if (typeof entry !== 'object' || entry === null) return [];
		const row = entry as { product_id?: unknown; qty?: unknown; price?: unknown };
		if (typeof row.product_id !== 'string') return [];
		if (typeof row.qty !== 'number' || !Number.isInteger(row.qty) || row.qty < 1) return [];
		if (typeof row.price !== 'number' || !Number.isFinite(row.price)) return [];
		return [{ product_id: row.product_id, qty: row.qty, price: row.price }];
	});
}

async function backfillItemsFromCartArchive(
	supabase: App.Locals['supabase'],
	orders: Orders
): Promise<void> {
	const ordersMissingItems = orders.filter(
		(order) =>
			order.item_snapshot.length === 0 &&
			order.cart_id &&
			!order.payment_method.includes('PrintRequest')
	);

	if (ordersMissingItems.length === 0) return;

	const cartIds = [...new Set(ordersMissingItems.map((order) => order.cart_id!).filter(Boolean))];
	const { data: archivedCarts } = await supabase
		.from('cart_archive')
		.select('id, list')
		.in('id', cartIds);

	const listByCartId = new Map(
		(archivedCarts ?? []).map((cart) => [cart.id as string, cart.list] as const)
	);

	for (const order of ordersMissingItems) {
		const lines = parseLegacyCartList(listByCartId.get(order.cart_id!));
		if (lines.length === 0) continue;

		order.item_snapshot = lines.map((line) => ({
			product_id: line.product_id,
			product_name: '',
			qty: line.qty,
			price: line.price,
			author: null,
			authorTier: null
		}));
	}
}

function mapArchivedPurchaseToProfile(row: ArchivedPurchaseRow, userId: string): Orders[number] {
	const items = Array.isArray(row.item_snapshot)
		? row.item_snapshot
				.filter(
					(item): item is {
						product_id: string;
						product_name: string;
						qty: number;
						price: number;
						author?: string | null;
						authorTier?: string | null;
					} =>
						typeof item === 'object' &&
						item !== null &&
						typeof (item as { product_id?: unknown }).product_id === 'string' &&
						typeof (item as { product_name?: unknown }).product_name === 'string' &&
						typeof (item as { qty?: unknown }).qty === 'number' &&
						typeof (item as { price?: unknown }).price === 'number'
				)
				.map((item) => ({
					product_id: item.product_id,
					product_name: item.product_name,
					qty: item.qty,
					price: item.price,
					author: item.author ?? null,
					authorTier: item.authorTier ?? null
				}))
		: [];

	return {
		created_at: row.created_at,
		payment_status: mapOrderStatus(row.payment_status ?? 'failed'),
		payment_method: row.payment_method ?? 'Razorpay',
		payment_id: row.payment_id_b,
		billing_address: stringifyAddress(row.billing_address),
		shipping_address: stringifyAddress(row.shipping_address),
		trackingId: row.trackingId,
		trackingCourier: row.trackingCourier,
		trackingUrl: row.trackingUrl,
		uid: userId,
		id: row.cart_id ?? `legacy-${row.id}`,
		amount: row.amount ?? 0,
		cart_id: row.cart_id,
		item_snapshot: items
	};
}

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user, session } = await safeGetSession();
	if (!user) {
		return { orders: [] as Orders };
	}

	let cartOrders: Orders = [];

	if (session?.access_token) {
		try {
			const response = await fetch(`${API_ORIGIN}/orders`, {
				headers: {
					authorization: `Bearer ${session.access_token}`,
					'x-request-id': crypto.randomUUID()
				},
				signal: AbortSignal.timeout(10_000)
			});

			if (response.ok) {
				const data = (await response.json()) as ListUserOrdersResponse;
				cartOrders = data.orders.map(mapApiOrderToProfile);
			}
		} catch {
			// Profile still shows print requests if cart orders API is unreachable.
		}
	}

	const { data: printRequests } = await supabase
		.from('printrequests')
		.select('id, created_at, request_stage, events, address')
		.eq('user_id', user.id)
		.in('request_stage', [...PRINT_HISTORY_STAGES])
		.order('created_at', { ascending: false });

	const printOrders = (printRequests ?? []).map(mapPrintRequestToProfileOrder);

	const { data: archivedPurchases } = await supabase
		.from('purchases_archive')
		.select(
			'id, created_at, payment_status, payment_method, amount, cart_id, billing_address, shipping_address, trackingId, trackingCourier, trackingUrl, payment_id_b, item_snapshot'
		)
		.eq('uid', user.id)
		.order('created_at', { ascending: false });

	const cartOrderCartIds = new Set(
		cartOrders.map((order) => order.cart_id).filter((cartId): cartId is string => Boolean(cartId))
	);

	const legacyCartOrders = (archivedPurchases ?? [])
		.filter((row) => !row.cart_id || !cartOrderCartIds.has(row.cart_id))
		.map((row) => mapArchivedPurchaseToProfile(row as ArchivedPurchaseRow, user.id));

	const orders = [...cartOrders, ...legacyCartOrders, ...printOrders].sort(
		(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	);

	await backfillItemsFromCartArchive(supabase, orders);

	const productIds = [
		...new Set(
			orders.flatMap((order) => order.item_snapshot.map((item) => item.product_id)).filter(Boolean)
		)
	];

	if (productIds.length > 0) {
		const { data: products } = await supabase
			.from('products')
			.select('id, name, author, images, uid, users(tier)')
			.in('id', productIds);

		const productMeta = new Map<
			string,
			{ name: string | null; author: string | null; authorTier: string | null; imageUrl: string | null }
		>();

		for (const product of products ?? []) {
			const images = Array.isArray(product.images)
				? (product.images as { url?: string }[])
				: [];
			const userRef = Array.isArray(product.users)
				? product.users[0]
				: product.users;
			const authorTier =
				typeof userRef === 'object' && userRef !== null && 'tier' in userRef
					? ((userRef as { tier?: string | null }).tier ?? null)
					: null;
			productMeta.set(product.id, {
				name: product.name ?? null,
				author: product.author ?? null,
				authorTier,
				imageUrl: images[0]?.url ?? null
			});
		}

		for (const order of orders) {
			order.item_snapshot = order.item_snapshot.map((item) => {
				const meta = productMeta.get(item.product_id);
				return {
					...item,
					product_name: item.product_name || meta?.name || 'Product',
					author: item.author ?? meta?.author ?? null,
					authorTier: item.authorTier ?? meta?.authorTier ?? null,
					image_url: meta?.imageUrl ?? null
				};
			});
		}
	}

	return { orders };
};
