import type { Json } from '../../../supabase/types';

export interface PrintModelData {
	color: string;
	material: string;
	quality: string;
	scale: number;
	infill: number;
	walls: number;
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
		walls: Number(record.walls ?? 0)
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
