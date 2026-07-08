import type { CheckoutAddress } from '../contracts/address.js';

export const PAYABLE_PRINT_REQUEST_STAGES = ['quoted'] as const;

export type PayablePrintRequestStage = (typeof PAYABLE_PRINT_REQUEST_STAGES)[number];

export type PrintRequestEvent = {
	by: string;
	type: string;
	reason?: string;
	timestamp: string;
	extra?: Record<string, unknown>;
};

export function isPayablePrintRequestStage(
	stage: string | null | undefined
): stage is PayablePrintRequestStage {
	return PAYABLE_PRINT_REQUEST_STAGES.includes(stage as PayablePrintRequestStage);
}

export function getLatestQuote(events: unknown): number | null {
	if (!Array.isArray(events)) return null;

	const quotedEvents = events
		.filter(
			(event): event is PrintRequestEvent =>
				typeof event === 'object' &&
				event !== null &&
				(event as PrintRequestEvent).type === 'quoted' &&
				typeof (event as PrintRequestEvent).extra?.quote !== 'undefined'
		)
		.sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime());

	if (quotedEvents.length === 0) return null;

	const quote = Number(quotedEvents[0]!.extra!.quote);
	return Number.isFinite(quote) && quote > 0 ? quote : null;
}

export function normalizePrintEvents(events: unknown): PrintRequestEvent[] {
	return Array.isArray(events) ? (events as PrintRequestEvent[]) : [];
}

export function normalizePrintAddress(address: CheckoutAddress) {
	return {
		shipping: address,
		billing: address
	};
}

export function getPrintRequestAddressPart(
	address: unknown,
	part: 'billing' | 'shipping'
): CheckoutAddress | null {
	if (!address || typeof address !== 'object' || Array.isArray(address)) return null;
	const record = address as Record<string, unknown>;
	const value = record[part];
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	return value as CheckoutAddress;
}

export function buildOrderCreatedEvent(amount: number, orderId: string): PrintRequestEvent {
	return {
		by: 'user',
		type: 'order_created',
		reason: `Payment for 3D Print Request of amount ${amount}`,
		timestamp: new Date().toISOString(),
		extra: {
			amount,
			order_id: orderId
		}
	};
}

export function buildPaidEvent(
	paymentIdA: string,
	paymentIdB: string,
	amount: number
): PrintRequestEvent {
	return {
		by: 'user',
		type: 'paid',
		reason: 'Payment verified for 3D Print Request',
		timestamp: new Date().toISOString(),
		extra: {
			payment_id_a: paymentIdA,
			payment_id_b: paymentIdB,
			amount
		}
	};
}

export function buildPaymentFailedEvent(orderId: string, reason?: string): PrintRequestEvent {
	return {
		by: 'user',
		type: 'payment_failed',
		reason: reason ?? 'Payment failed or abandoned',
		timestamp: new Date().toISOString(),
		extra: {
			order_id: orderId,
			...(reason ? { failure_reason: reason } : {})
		}
	};
}

export function getOrderCreatedAmount(
	events: unknown,
	orderId: string | null | undefined
): number | null {
	if (!orderId || !Array.isArray(events)) return null;

	const matchingEvents = events
		.filter(
			(event): event is PrintRequestEvent =>
				typeof event === 'object' &&
				event !== null &&
				(event as PrintRequestEvent).type === 'order_created' &&
				(event as PrintRequestEvent).extra?.order_id === orderId &&
				typeof (event as PrintRequestEvent).extra?.amount !== 'undefined'
		)
		.sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime());

	if (matchingEvents.length === 0) return null;

	const amount = Number(matchingEvents[0]!.extra!.amount);
	return Number.isFinite(amount) ? amount : null;
}

export function shouldReuseRazorpayOrder(
	orderId: string | null | undefined,
	events: unknown,
	latestQuote: number
): boolean {
	if (!orderId) return false;
	const orderAmount = getOrderCreatedAmount(events, orderId);
	return orderAmount === latestQuote;
}

export function isPrintRequestOwnedBy(
	printRequest: { userId: string | null },
	userId: string
): boolean {
	return printRequest.userId === userId;
}
