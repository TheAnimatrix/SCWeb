import type {
	CartView,
	CheckoutAddress,
	CheckoutOrderStatusResponse,
	ConfirmCheckoutResponse,
	CreateCheckoutOrderResponse,
	FailCheckoutResponse,
	GetCartResponse,
	MergeCartResponse
} from '@scweb/api/contracts';
import type { Address } from '$lib/types/product';
import { writable, type Writable } from 'svelte/store';

export interface CartG {
	valid: boolean;
	itemCount: number;
}

export const initCartG = (): Writable<CartG> =>
	writable({
		valid: false,
		itemCount: 0
	});

function cartItemCount(cart: CartView | null | undefined): number {
	if (!cart) return 0;
	return cart.items.reduce((sum, item) => sum + item.qty, 0);
}

export function syncCartStore(cartStore: Writable<CartG>, cart: CartView | null | undefined) {
	cartStore.set({ valid: true, itemCount: cartItemCount(cart) });
}

export type CartApiError =
	| { kind: 'insufficient_stock'; limit: number; productId?: string; message: string }
	| { kind: 'listing_not_available'; productId?: string; message: string }
	| { kind: 'product_not_found'; message: string }
	| { kind: 'cart_empty'; message: string }
	| { kind: 'payments_unconfigured'; message: string }
	| { kind: 'invalid_signature'; message: string }
	| { kind: 'order_not_found'; message: string }
	| { kind: 'forbidden'; message: string }
	| { kind: 'stock_conflict'; orderId?: string; message: string }
	| { kind: 'duplicate_payment'; orderId?: string; message: string }
	| { kind: 'razorpay_order_failed'; message: string }
	| { kind: 'unauthorized'; message: string }
	| { kind: 'rate_limited'; message: string }
	| { kind: 'network'; message: string }
	| { kind: 'unknown'; message: string };

export type CartApiResult<T> = { ok: true; data: T } | { ok: false; error: CartApiError };

type ApiErrorBody = {
	error?: string;
	message?: string;
	limit?: number;
	productId?: string;
	orderId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function parseErrorBody(body: unknown): ApiErrorBody {
	if (!isRecord(body)) return {};
	return {
		error: typeof body.error === 'string' ? body.error : undefined,
		message: typeof body.message === 'string' ? body.message : undefined,
		limit: typeof body.limit === 'number' ? body.limit : undefined,
		productId: typeof body.productId === 'string' ? body.productId : undefined,
		orderId: typeof body.orderId === 'string' ? body.orderId : undefined
	};
}

/** "Only 2 left. Lower the quantity to continue." / out-of-stock wording at 0. */
export function stockLimitMessage(limit: number, name?: string): string {
	if (limit <= 0) {
		return name
			? `${name} is now out of stock. Remove it to check out.`
			: 'This item is now out of stock. Remove it to check out.';
	}
	return name
		? `Only ${limit} left of ${name}. Lower the quantity to continue.`
		: `Only ${limit} left. Lower the quantity to continue.`;
}

const GENERIC_ERROR = 'Something went wrong. Try again.';
const SESSION_ENDED = 'Your session has ended. Sign in again to continue.';
const RATE_LIMITED = 'Too many attempts. Wait a minute and try again.';

export function mapApiError(status: number, body: unknown): CartApiError {
	const parsed = parseErrorBody(body);

	switch (parsed.error) {
		case 'insufficient_stock': {
			const limit = parsed.limit ?? 0;
			return {
				kind: 'insufficient_stock',
				limit,
				...(parsed.productId ? { productId: parsed.productId } : {}),
				message: stockLimitMessage(limit)
			};
		}
		case 'listing_not_available':
			return {
				kind: 'listing_not_available',
				...(parsed.productId ? { productId: parsed.productId } : {}),
				message: 'An item in your cart is no longer available. Remove it to check out.'
			};
		case 'product_not_found':
			return { kind: 'product_not_found', message: 'That product is no longer available.' };
		case 'cart_empty':
			return { kind: 'cart_empty', message: 'Your cart is empty.' };
		case 'payments_unconfigured':
			return {
				kind: 'payments_unconfigured',
				message: 'Payments are not available right now. Nothing was charged. Try again later.'
			};
		case 'invalid_signature':
			return { kind: 'invalid_signature', message: 'We could not verify the payment.' };
		case 'order_not_found':
			return { kind: 'order_not_found', message: 'Order not found.' };
		case 'forbidden':
			return { kind: 'forbidden', message: parsed.message ?? GENERIC_ERROR };
		case 'stock_conflict':
			return {
				kind: 'stock_conflict',
				...(parsed.orderId ? { orderId: parsed.orderId } : {}),
				message: 'An item sold out while you were paying.'
			};
		case 'duplicate_payment':
			return {
				kind: 'duplicate_payment',
				...(parsed.orderId ? { orderId: parsed.orderId } : {}),
				message: 'This cart was already paid for.'
			};
		case 'razorpay_order_failed':
			return {
				kind: 'razorpay_order_failed',
				message:
					"Couldn't start payment. Nothing was charged. Try again or write to support@selfcrafted.in."
			};
		case 'unauthorized':
			return { kind: 'unauthorized', message: SESSION_ENDED };
		case 'rate_limited':
			return { kind: 'rate_limited', message: RATE_LIMITED };
		default:
			if (status === 429) {
				return { kind: 'rate_limited', message: RATE_LIMITED };
			}
			if (status === 401) {
				return { kind: 'unauthorized', message: SESSION_ENDED };
			}
			if (status >= 500) {
				return { kind: 'unknown', message: GENERIC_ERROR };
			}
			return { kind: 'unknown', message: parsed.message ?? GENERIC_ERROR };
	}
}

async function readJson(response: Response): Promise<unknown> {
	const text = await response.text();
	if (!text) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return null;
	}
}

async function apiRequest<T>(
	fetchFn: typeof fetch,
	path: string,
	init?: RequestInit
): Promise<CartApiResult<T>> {
	let response: Response;
	try {
		response = await fetchFn(`/api${path}`, {
			...init,
			headers: {
				...(init?.body ? { 'content-type': 'application/json' } : {}),
				...init?.headers
			}
		});
	} catch {
		return {
			ok: false,
			error: {
				kind: 'network',
				message: "Couldn't reach Selfcrafted. Check your connection and try again."
			}
		};
	}

	const body = await readJson(response);
	if (!response.ok) {
		return { ok: false, error: mapApiError(response.status, body) };
	}

	return { ok: true, data: body as T };
}

export function stripCheckoutAddress(address: Address): CheckoutAddress {
	return {
		name: address.name!,
		line1: address.line1!,
		line2: address.line2,
		city: address.city!,
		pincode: address.pincode!,
		state: address.state!,
		phone: address.phone!,
		...(address.email ? { email: address.email } : {})
	};
}

export async function getCart(fetchFn: typeof fetch): Promise<CartApiResult<GetCartResponse>> {
	return apiRequest<GetCartResponse>(fetchFn, '/cart');
}

export async function setCartItem(
	fetchFn: typeof fetch,
	productId: string,
	qty: number,
	mode: 'set' | 'add'
): Promise<CartApiResult<GetCartResponse>> {
	return apiRequest<GetCartResponse>(fetchFn, `/cart/items/${productId}`, {
		method: 'PUT',
		body: JSON.stringify({ qty, mode })
	});
}

export async function mergeGuestCart(
	fetchFn: typeof fetch,
	clientId: string
): Promise<CartApiResult<MergeCartResponse>> {
	return apiRequest<MergeCartResponse>(fetchFn, '/cart/merge', {
		method: 'POST',
		body: JSON.stringify({ clientId })
	});
}

export async function createCheckoutOrder(
	fetchFn: typeof fetch,
	shippingAddress: Address,
	billingAddress?: Address,
	options?: { refreshPayment?: boolean }
): Promise<CartApiResult<CreateCheckoutOrderResponse>> {
	const body: {
		address: ReturnType<typeof stripCheckoutAddress>;
		billingAddress?: ReturnType<typeof stripCheckoutAddress>;
		refreshPayment?: boolean;
	} = {
		address: stripCheckoutAddress(shippingAddress)
	};

	if (billingAddress) {
		body.billingAddress = stripCheckoutAddress(billingAddress);
	}

	if (options?.refreshPayment) {
		body.refreshPayment = true;
	}

	return apiRequest<CreateCheckoutOrderResponse>(fetchFn, '/checkout/order', {
		method: 'POST',
		body: JSON.stringify(body)
	});
}

export async function confirmCheckout(
	fetchFn: typeof fetch,
	ids: {
		razorpayOrderId: string;
		razorpayPaymentId: string;
		razorpaySignature: string;
	}
): Promise<CartApiResult<ConfirmCheckoutResponse>> {
	return apiRequest<ConfirmCheckoutResponse>(fetchFn, '/checkout/confirm', {
		method: 'POST',
		body: JSON.stringify(ids)
	});
}

export async function failCheckout(
	fetchFn: typeof fetch,
	razorpayOrderId: string,
	reason?: string
): Promise<CartApiResult<FailCheckoutResponse>> {
	return apiRequest<FailCheckoutResponse>(fetchFn, '/checkout/fail', {
		method: 'POST',
		body: JSON.stringify({ razorpayOrderId, ...(reason ? { reason } : {}) })
	});
}

/** Owner-only order lookup for the payment result pages. 404 means not found or not yours. */
export async function getCheckoutOrderStatus(
	fetchFn: typeof fetch,
	query: { paymentId?: string; razorpayOrderId?: string }
): Promise<CartApiResult<CheckoutOrderStatusResponse>> {
	const params = new URLSearchParams();
	if (query.paymentId) params.set('paymentId', query.paymentId);
	if (query.razorpayOrderId) params.set('razorpayOrderId', query.razorpayOrderId);
	return apiRequest<CheckoutOrderStatusResponse>(
		fetchFn,
		`/checkout/order-status?${params.toString()}`
	);
}
