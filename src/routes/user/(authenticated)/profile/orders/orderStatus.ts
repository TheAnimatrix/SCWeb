import type { Orders } from '$lib/types/product';

/**
 * Buyer-facing order states for the profile orders list.
 *
 * Sources:
 * - cart orders (`orders.status`): payment_pending | paid | failed | fulfilled | cancelled | refunded.
 *   There is no separate "delivered" state; `fulfilled` is the only post-payment step and is shown as Shipped.
 * - print requests (`printrequests.request_stage`): paid | paid_externally | shipped | completed (buyer
 *   confirmed receipt) | cancelled.
 * - legacy `purchases_archive.payment_status`: free text from the old checkout (paid, completed,
 *   pending, failed, …).
 */
export type ProfileOrderStatus =
	| 'payment_pending'
	| 'payment_failed'
	| 'paid'
	| 'awaiting_dispatch'
	| 'shipped'
	| 'delivered'
	| 'cancelled'
	| 'refunded'
	| 'unknown';

export type ProfileOrderSource = 'cart' | 'print' | 'legacy';

export function toProfileOrderStatus(
	source: ProfileOrderSource,
	raw: string | null | undefined
): ProfileOrderStatus {
	const status = (raw ?? '').trim().toLowerCase();

	if (source === 'print') {
		switch (status) {
			case 'paid':
			case 'paid_externally':
				return 'awaiting_dispatch';
			case 'shipped':
				return 'shipped';
			case 'completed':
				return 'delivered';
			case 'cancelled':
				return 'cancelled';
			default:
				return 'unknown';
		}
	}

	switch (status) {
		case 'payment_pending':
		case 'pending':
			return 'payment_pending';
		case 'failed':
			return 'payment_failed';
		case 'paid':
			// Old checkout rows never moved past "paid", so don't claim they are still awaiting dispatch.
			return source === 'legacy' ? 'paid' : 'awaiting_dispatch';
		case 'completed':
			return 'paid';
		case 'fulfilled':
		case 'shipped':
			return 'shipped';
		case 'delivered':
			return 'delivered';
		case 'cancelled':
			return 'cancelled';
		case 'refunded':
			return 'refunded';
		default:
			return 'unknown';
	}
}

export type StatusTone = 'success' | 'progress' | 'warning' | 'danger' | 'neutral';

export type StatusDisplay = { label: string; tone: StatusTone; icon: string };

export const ORDER_STATUS_DISPLAY: Record<ProfileOrderStatus, StatusDisplay> = {
	payment_pending: { label: 'Payment pending', tone: 'warning', icon: 'fluent:clock-24-regular' },
	payment_failed: {
		label: 'Payment failed',
		tone: 'danger',
		icon: 'fluent:dismiss-circle-24-regular'
	},
	paid: { label: 'Paid', tone: 'success', icon: 'fluent:checkmark-circle-24-regular' },
	awaiting_dispatch: {
		label: 'Paid, awaiting dispatch',
		tone: 'progress',
		icon: 'fluent:box-24-regular'
	},
	shipped: { label: 'Shipped', tone: 'progress', icon: 'fluent:vehicle-truck-24-regular' },
	delivered: { label: 'Delivered', tone: 'success', icon: 'fluent:checkmark-circle-24-regular' },
	cancelled: { label: 'Cancelled', tone: 'neutral', icon: 'fluent:prohibited-24-regular' },
	refunded: {
		label: 'Refunded',
		tone: 'neutral',
		icon: 'fluent:arrow-counterclockwise-24-regular'
	},
	unknown: {
		label: 'Status unavailable',
		tone: 'neutral',
		icon: 'fluent:question-circle-24-regular'
	}
};

/** Failed payment attempts are not orders; the list shows them in a separate group. */
export function isFailedPaymentAttempt(status: ProfileOrderStatus): boolean {
	return status === 'payment_failed';
}

/** A profile order row: the shared `Orders` shape plus the buyer-facing status and delivery fee. */
export type ProfileOrder = Orders[number] & {
	status: ProfileOrderStatus;
	/** Delivery fee in rupees when the source records it; null for print requests and old orders. */
	delivery_fee: number | null;
};
