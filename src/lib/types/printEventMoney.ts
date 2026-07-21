import type { PrintRequestEventExtra } from './printRequest';

export function formatPrintEventAmountInr(extra?: PrintRequestEventExtra): string | null {
	if (!extra) return null;

	if (typeof extra.amount_paise === 'number' && Number.isFinite(extra.amount_paise)) {
		return (extra.amount_paise / 100).toFixed(2);
	}

	if (typeof extra.amount === 'number' || typeof extra.amount === 'string') {
		const amount = Number(extra.amount);
		if (Number.isFinite(amount)) {
			return amount.toFixed(2);
		}
	}

	if (typeof extra.quote === 'number' || typeof extra.quote === 'string') {
		const quote = Number(extra.quote);
		if (Number.isFinite(quote)) {
			return quote.toFixed(2);
		}
	}

	return null;
}
