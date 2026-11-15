import type { Json } from '../../../supabase/types';

export interface PrintModelData {
	color: string;
	material: string;
	quality: string;
	scale: number;
	infill: number;
	/** Only sent by newer clients; null for requests made before walls were stored. */
	walls: number | null;
}

export interface PrintRequestEventExtra {
	quote?: number | string;
	payment_id_a?: string;
	payment_id_b?: string;
	amount?: number | string;
	amount_paise?: number | string;
	[key: string]: unknown;
}

export interface PrintRequestEvent {
	type: string;
	timestamp: string;
	extra?: PrintRequestEventExtra;
	[key: string]: unknown;
}

export interface PrintRequest {
	id: string;
	user_id: string | null;
	creator_id: string | null;
	request_stage: string | null;
	created_at: string;
	last_updated?: string | null;
	update_count?: number | null;
	model: string | null;
	model_metadata?: Json | null;
	model_data: PrintModelData;
	events: PrintRequestEvent[];
	quote_updates?: number | null;
	initial_quote?: number | null;
	quote?: number | null;
	filament_color?: string | null;
	request_metadata?: Json | null;
	order_id?: string | null;
	payment_id?: string | null;
	address?: unknown;
	[key: string]: unknown;
}

export function parsePrintModelData(value: Json | null | undefined): PrintModelData {
	const record =
		value && typeof value === 'object' && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};

	return {
		color: String(record.color ?? ''),
		material: String(record.material ?? ''),
		quality: String(record.quality ?? ''),
		scale: Number(record.scale ?? 1),
		infill: Number(record.infill ?? 0),
		walls:
			record.walls == null || record.walls === '' || !Number.isFinite(Number(record.walls))
				? null
				: Number(record.walls)
	};
}

export function asPrintRequest(value: unknown): PrintRequest | null {
	if (!value || typeof value !== 'object') return null;

	const record = value as Record<string, unknown>;
	if (typeof record.id !== 'string') return null;

	return {
		...(record as Omit<PrintRequest, 'model_data' | 'events'>),
		model_data: parsePrintModelData(record.model_data as Json),
		events: Array.isArray(record.events) ? (record.events as PrintRequestEvent[]) : []
	} as PrintRequest;
}

export function getPrintRequestDisplayName(
	model: string | null | undefined,
	modelMetadata: Json | null | undefined
): string {
	if (modelMetadata && typeof modelMetadata === 'object' && !Array.isArray(modelMetadata)) {
		const originalFilename = (modelMetadata as Record<string, unknown>).originalFilename;
		if (typeof originalFilename === 'string' && originalFilename.trim().length > 0) {
			return originalFilename.trim();
		}
	}

	if (!model) {
		return 'Model';
	}

	const path = model.split('/').pop() ?? model;
	const segments = path.split('.');
	if (segments.length < 2) {
		return path || 'Model';
	}

	const prefix = segments[segments.length - 2]?.split('_') ?? [];
	return `${prefix[prefix.length - 1] ?? 'model'}.${segments[segments.length - 1]}`;
}

const PRINT_STAGE_LABELS: Record<string, string> = {
	requested: 'Waiting for quote',
	quoted: 'Quoted',
	actionable: 'Needs action',
	paid: 'Paid',
	paid_externally: 'Paid',
	shipped: 'Shipped',
	completed: 'Delivered',
	cancelled: 'Cancelled',
	'in dispute': 'In dispute'
};

/** Plain label for a print request stage; never shows a raw enum value. */
export function printStageLabel(stage: string | null | undefined): string {
	if (!stage) return 'Unknown';
	return PRINT_STAGE_LABELS[stage] ?? 'Unknown';
}

/** Stages where the maker has the next step: quote a new request, or ship a paid one. */
export function makerHasNextStep(stage: string | null | undefined): boolean {
	return stage === 'requested' || stage === 'paid' || stage === 'paid_externally';
}

/** Stages after the customer has paid. */
export function isPaidStage(stage: string | null | undefined): boolean {
	return (
		stage === 'paid' || stage === 'paid_externally' || stage === 'shipped' || stage === 'completed'
	);
}

/** "120 × 80 × 35 mm" from the size the customer's browser measured (already scaled). */
export function getPrintModelSize(modelMetadata: Json | null | undefined): string | null {
	if (!modelMetadata || typeof modelMetadata !== 'object' || Array.isArray(modelMetadata)) {
		return null;
	}
	const dims = (modelMetadata as Record<string, unknown>).dimensions;
	if (!dims || typeof dims !== 'object' || Array.isArray(dims)) return null;
	const { x, y, z } = dims as Record<string, unknown>;
	const values = [x, y, z].map((value) => Number(value));
	if (values.some((value) => !Number.isFinite(value) || value <= 0)) return null;
	return `${values.map((value) => Math.round(value * 10) / 10).join(' × ')} mm`;
}

/** Who did something in the event history, from the reader's point of view. */
export function printEventActor(
	by: unknown,
	viewer: 'customer' | 'maker'
): 'you' | 'the customer' | 'the maker' | 'Selfcrafted' {
	if (by === 'user') return viewer === 'customer' ? 'you' : 'the customer';
	if (by === 'maker' || by === 'creator') return viewer === 'maker' ? 'you' : 'the maker';
	return 'Selfcrafted';
}

const PRINT_EVENT_LABELS: Record<string, string> = {
	quoted: 'Quote sent',
	paid: 'Paid',
	paid_externally: 'Paid',
	shipped: 'Shipped',
	completed: 'Delivered',
	cancelled: 'Cancelled',
	declined: 'Declined',
	payment_failed: 'Payment failed',
	actionable: 'Action requested'
};

/** Plain label for an event type; unknown types fall back to sentence case. */
export function printEventLabel(type: string): string {
	if (PRINT_EVENT_LABELS[type]) return PRINT_EVENT_LABELS[type];
	const text = type.replace(/_/g, ' ');
	return text.charAt(0).toUpperCase() + text.slice(1);
}
