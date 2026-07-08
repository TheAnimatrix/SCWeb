import type { PrintRequestEvent } from './print-payments.js';

export type PrintRequestStage =
	| 'requested'
	| 'quoted'
	| 'actionable'
	| 'paid'
	| 'paid_externally'
	| 'shipped'
	| 'completed'
	| 'cancelled'
	| 'in dispute';

export type MakerAction = 'quote' | 'decline' | 'shipped';
export type UserAction = 'cancel' | 'complete';
export type PrintRequestAction = MakerAction | UserAction | 'cancel';

const MAKER_ACTIONS = new Set<PrintRequestAction>(['quote', 'decline', 'shipped', 'cancel']);
const USER_ACTIONS = new Set<PrintRequestAction>(['cancel', 'complete']);

export function isMakerAction(action: PrintRequestAction): action is MakerAction | 'cancel' {
	return MAKER_ACTIONS.has(action);
}

export function isUserAction(action: PrintRequestAction): action is UserAction {
	return USER_ACTIONS.has(action);
}

type TransitionRule = {
	from: PrintRequestStage[];
	to: PrintRequestStage;
};

export const ACTION_TRANSITIONS: Record<PrintRequestAction, TransitionRule> = {
	quote: {
		from: ['requested', 'quoted'],
		to: 'quoted'
	},
	decline: {
		from: ['requested', 'quoted'],
		to: 'cancelled'
	},
	cancel: {
		from: ['requested', 'quoted'],
		to: 'cancelled'
	},
	shipped: {
		from: ['paid'],
		to: 'shipped'
	},
	complete: {
		from: ['shipped'],
		to: 'completed'
	}
};

export function canTransition(
	currentStage: string | null | undefined,
	action: PrintRequestAction
): boolean {
	if (!currentStage) return false;
	if (currentStage === 'paid') {
		return action === 'shipped';
	}
	if (action !== 'shipped' && currentStage === 'paid') {
		return false;
	}

	const rule = ACTION_TRANSITIONS[action];
	return rule.from.includes(currentStage as PrintRequestStage);
}

export function normalizePrintRequestEvents(events: unknown): PrintRequestEvent[] {
	return Array.isArray(events) ? (events as PrintRequestEvent[]) : [];
}

export function appendEvent(
	events: PrintRequestEvent[],
	event: PrintRequestEvent
): PrintRequestEvent[] {
	return [...events, event];
}
