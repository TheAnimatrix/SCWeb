import type { Json } from '../../../supabase/types';

/** Form payload for the maker onboarding application (maps to PrintingCrafters insert). */
export interface MakerApplication {
	name: string;
	contactNumber: string;
	email: string;
	maxPrinterSize: string;
	numPrinters: number;
	selectedFilaments: string[];
}

/** Server-side insert shape for PrintingCrafters (database column names). */
export interface MakerApplicationRecord {
	maker_id: string;
	name: string;
	contact_number: string;
	email: string;
	max_printer_size: string;
	number_of_printers: number;
	filament_types: string[];
	filaments?: Json | null;
	approved_state?: string | null;
}

function plural(value: number, unit: string): string {
	return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

/**
 * `avg_quote_time` is stored as a string of whole seconds (see api creator-stats).
 * Returns "Usually quotes within 2 hours", or null when there is no usable value.
 */
export function formatQuoteTime(avgQuoteTime: number | string | null | undefined): string | null {
	if (avgQuoteTime == null || avgQuoteTime === '') return null;
	const seconds = typeof avgQuoteTime === 'number' ? avgQuoteTime : Number(avgQuoteTime);
	if (!Number.isFinite(seconds) || seconds <= 0) return null;

	let span: string;
	if (seconds < 60 * 60) {
		span = `${Math.max(1, Math.ceil(seconds / 60))} min`;
	} else if (seconds < 24 * 60 * 60) {
		span = plural(Math.ceil(seconds / (60 * 60)), 'hour');
	} else {
		span = plural(Math.ceil(seconds / (24 * 60 * 60)), 'day');
	}
	return `Usually quotes within ${span}`;
}
