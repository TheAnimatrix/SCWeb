/**
 * Shared money and date formatting. Use these everywhere a price or date is shown,
 * so "₹12,500" and "15 Nov 2026" read the same on every page.
 */

/** `formatInr(12500)` -> "₹12,500". Paise are shown only when the amount has them. */
export function formatInr(amount: number | string | null | undefined): string {
	const value = typeof amount === 'string' ? Number(amount) : amount;
	if (value == null || !Number.isFinite(value)) return '₹0';
	const hasPaise = Math.round(value * 100) % 100 !== 0;
	return `₹${value.toLocaleString('en-IN', {
		minimumFractionDigits: hasPaise ? 2 : 0,
		maximumFractionDigits: 2
	})}`;
}

/** `formatInrFromPaise(1250000)` -> "₹12,500". */
export function formatInrFromPaise(paise: number | null | undefined): string {
	return formatInr(paise == null ? null : paise / 100);
}

function toDate(input: string | number | Date | null | undefined): Date | null {
	if (input == null || input === '') return null;
	const date = input instanceof Date ? input : new Date(input);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** "15 Nov 2026" */
export function formatDate(input: string | number | Date | null | undefined): string {
	const date = toDate(input);
	if (!date) return '';
	return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "15 Nov 2026, 3:42 pm" */
export function formatDateTime(input: string | number | Date | null | undefined): string {
	const date = toDate(input);
	if (!date) return '';
	return date.toLocaleString('en-IN', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});
}

/** "Nov 2026" */
export function formatMonthYear(input: string | number | Date | null | undefined): string {
	const date = toDate(input);
	if (!date) return '';
	return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}
