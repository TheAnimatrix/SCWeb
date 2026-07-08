import type {
	ConfirmPrintPaymentResponse,
	CreatePrintPaymentOrderResponse,
	FailPrintPaymentResponse
} from '@scweb/api/contracts';
import type { Address } from '$lib/types/product';
import { stripCheckoutAddress } from '$lib/client/cartApi';

export type PrintPaymentsApiError =
	| { kind: 'not_found'; message: string }
	| { kind: 'forbidden'; message: string }
	| { kind: 'not_payable'; message: string }
	| { kind: 'no_quote'; message: string }
	| { kind: 'payments_unconfigured'; message: string }
	| { kind: 'invalid_signature'; message: string }
	| { kind: 'order_mismatch'; message: string }
	| { kind: 'no_order'; message: string }
	| { kind: 'razorpay_order_failed'; message: string }
	| { kind: 'unauthorized'; message: string }
	| { kind: 'rate_limited'; message: string }
	| { kind: 'network'; message: string }
	| { kind: 'unknown'; message: string };

export type PrintPaymentsApiResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: PrintPaymentsApiError };

type ApiErrorBody = {
	error?: string;
	message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function parseErrorBody(body: unknown): ApiErrorBody {
	if (!isRecord(body)) return {};
	return {
		error: typeof body.error === 'string' ? body.error : undefined,
		message: typeof body.message === 'string' ? body.message : undefined
	};
}

export function mapPrintPaymentsError(status: number, body: unknown): PrintPaymentsApiError {
	const parsed = parseErrorBody(body);
	const fallbackMessage = parsed.message ?? 'Something went wrong. Please try again.';

	switch (parsed.error) {
		case 'not_found':
			return { kind: 'not_found', message: 'Print request not found.' };
		case 'forbidden':
			return { kind: 'forbidden', message: 'You do not have access to this print request.' };
		case 'not_payable':
			return {
				kind: 'not_payable',
				message: 'This print request is not ready for payment.'
			};
		case 'no_quote':
			return { kind: 'no_quote', message: 'No valid quote found for this request.' };
		case 'payments_unconfigured':
			return {
				kind: 'payments_unconfigured',
				message: 'Payments are temporarily unavailable. Please try again later.'
			};
		case 'invalid_signature':
			return { kind: 'invalid_signature', message: 'Payment verification failed.' };
		case 'order_mismatch':
			return { kind: 'order_mismatch', message: 'Payment order does not match this request.' };
		case 'no_order':
			return { kind: 'no_order', message: 'No payment order found for this request.' };
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
			if (status === 503 && parsed.error === 'payments_unconfigured') {
				return {
					kind: 'payments_unconfigured',
					message: 'Payments are temporarily unavailable. Please try again later.'
				};
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
): Promise<PrintPaymentsApiResult<T>> {
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
		return { ok: false, error: mapPrintPaymentsError(response.status, body) };
	}

	return { ok: true, data: body as T };
}

export async function createPrintPaymentOrder(
	fetchFn: typeof fetch,
	printRequestId: string,
	address: Address
): Promise<PrintPaymentsApiResult<CreatePrintPaymentOrderResponse>> {
	return apiRequest<CreatePrintPaymentOrderResponse>(
		fetchFn,
		`/print-payments/${printRequestId}/order`,
		{
			method: 'POST',
			body: JSON.stringify({ address: stripCheckoutAddress(address) })
		}
	);
}

export async function confirmPrintPayment(
	fetchFn: typeof fetch,
	printRequestId: string,
	ids: {
		razorpayOrderId: string;
		razorpayPaymentId: string;
		razorpaySignature: string;
	}
): Promise<PrintPaymentsApiResult<ConfirmPrintPaymentResponse>> {
	return apiRequest<ConfirmPrintPaymentResponse>(
		fetchFn,
		`/print-payments/${printRequestId}/confirm`,
		{
			method: 'POST',
			body: JSON.stringify(ids)
		}
	);
}

export async function failPrintPayment(
	fetchFn: typeof fetch,
	printRequestId: string,
	razorpayOrderId: string,
	reason?: string
): Promise<PrintPaymentsApiResult<FailPrintPaymentResponse>> {
	return apiRequest<FailPrintPaymentResponse>(fetchFn, `/print-payments/${printRequestId}/fail`, {
		method: 'POST',
		body: JSON.stringify({ razorpayOrderId, ...(reason ? { reason } : {}) })
	});
}
