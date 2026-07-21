import type {
	CartView,
	CheckoutAddress,
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
	| { kind: 'insufficient_stock'; limit: number; message: string }
	| { kind: 'product_not_found'; message: string }
	| { kind: 'cart_empty'; message: string }
	| { kind: 'payments_unconfigured'; message: string }
	| { kind: 'invalid_signature'; message: string }
	| { kind: 'order_not_found'; message: string }
	| { kind: 'forbidden'; message: string }
	| { kind: 'stock_conflict'; message: string }
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
		productId: typeof body.productId === 'string' ? body.productId : undefined
	};
}

export function mapApiError(status: number, body: unknown): CartApiError {
	const parsed = parseErrorBody(body);
	const fallbackMessage = parsed.message ?? 'Something went wrong. Please try again.';

	switch (parsed.error) {
		case 'insufficient_stock': {
			const limit = parsed.limit ?? 0;
			return {
				kind: 'insufficient_stock',
				limit,
				message: `Sorry! we only have ${limit} unit${limit === 1 ? '' : 's'} at the moment.`
			};
		}
		case 'product_not_found':
			return { kind: 'product_not_found', message: 'That product is no longer available.' };
		case 'cart_empty':
			return { kind: 'cart_empty', message: 'Your cart is empty.' };
		case 'payments_unconfigured':
			return {
				kind: 'payments_unconfigured',
				message: 'Payments are temporarily unavailable. Please try again later.'
			};
		case 'invalid_signature':
			return { kind: 'invalid_signature', message: 'Payment verification failed.' };
		case 'order_not_found':
			return { kind: 'order_not_found', message: 'Order not found.' };
		case 'forbidden':
			return { kind: 'forbidden', message: fallbackMessage };
		case 'stock_conflict':
			return {
				kind: 'stock_conflict',
				message: 'Stock changed during checkout. Please review your cart.'
			};
		case 'razorpay_order_failed':
			return {
				kind: 'razorpay_order_failed',
				message: 'Failed to create payment order. Please try again.'
			};
		case 'unauthorized':
			return { kind: 'unauthorized', message: fallbackMessage };
		case 'rate_limited':
			return { kind: 'rate_limited', message: 'Too many requests. Please wait and try again.' };
		default:
			if (status === 429) {
				return { kind: 'rate_limited', message: 'Too many requests. Please wait and try again.' };
			}
			if (status >= 500) {
				return { kind: 'unknown', message: 'Server error. Please try again.' };
			}
			return { kind: 'unknown', message: fallbackMessage };
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
		return { ok: false, error: { kind: 'network', message: 'Network error. Please try again.' } };
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
