import type {
	AdminInterestCampaigns,
	AdminInterestEntry,
	AdminInterestList
} from '@scweb/api/contracts';
import { mapApiError, type CartApiResult } from '$lib/client/cartApi';

/**
 * Staff-only interest-check endpoints. These return names, phone numbers and addresses, so
 * call them only from `+page.server.ts` loads that have already checked `isStaffUser`.
 */

async function readJson(response: Response): Promise<unknown> {
	const text = await response.text();
	if (!text) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return null;
	}
}

async function apiRequest<T>(fetchFn: typeof fetch, path: string): Promise<CartApiResult<T>> {
	let response: Response;
	try {
		response = await fetchFn(`/api${path}`);
	} catch {
		return { ok: false, error: { kind: 'network', message: 'Network error. Please try again.' } };
	}
	const body = await readJson(response);
	if (!response.ok) {
		return { ok: false, error: mapApiError(response.status, body) };
	}
	return { ok: true, data: body as T };
}

export async function listInterestCampaigns(fetchFn: typeof fetch) {
	return apiRequest<AdminInterestCampaigns>(fetchFn, '/admin/interest');
}

export async function getInterestList(fetchFn: typeof fetch, productId: string) {
	return apiRequest<AdminInterestList>(fetchFn, `/admin/interest/${encodeURIComponent(productId)}`);
}

/** Newest first, as staff read the list. */
export function sortEntriesNewestFirst(entries: AdminInterestEntry[]): AdminInterestEntry[] {
	return [...entries].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export const INTEREST_CSV_COLUMNS = [
	'Name',
	'Email',
	'Phone',
	'Address',
	'City',
	'State',
	'Pincode',
	'Joined',
	'Emailed'
] as const;

/** One CSV field: always quoted, quotes doubled, and spreadsheet formulas neutralised. */
export function csvField(value: string | null | undefined): string {
	let text = value ?? '';
	// A cell starting with = + - @ (or a tab/CR) runs as a formula in Excel and Sheets.
	if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
	return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Phone numbers stay text (leading + and 0 kept) when the CSV is opened in a spreadsheet.
 * The API blanks the phone number after a launch or closure; that is an empty cell.
 */
export function csvPhoneField(phone: string | null | undefined): string {
	const safe = (phone ?? '').replace(/[^0-9+\-() ]/g, '');
	return safe ? `"=""${safe}"""` : '""';
}

/** Street lines; empty once the API has blanked the address after a launch or closure. */
export function entryAddressLine(entry: AdminInterestEntry): string {
	return [entry.address?.line1, entry.address?.line2].filter(Boolean).join(', ');
}

export function buildInterestCsv(entries: AdminInterestEntry[]): string {
	const rows = entries.map((entry) =>
		[
			csvField(entry.name),
			csvField(entry.email),
			csvPhoneField(entry.phone),
			csvField(entryAddressLine(entry)),
			csvField(entry.address?.city),
			csvField(entry.address?.state),
			csvField(entry.address?.pincode),
			csvField(entry.createdAt),
			csvField(entry.notifiedAt)
		].join(',')
	);
	return [INTEREST_CSV_COLUMNS.map((c) => csvField(c)).join(','), ...rows].join('\r\n');
}
