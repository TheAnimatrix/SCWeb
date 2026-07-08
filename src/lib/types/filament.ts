import type { UserFilament } from './database';

/**
 * Filament inventory item as used in maker portal UI.
 * DB row fields: id, owner_id, material_type, color, brand (via UserFilament).
 * Optional fields below are UI-computed or form-only, not on the generated UserFilament row type.
 */
export interface Filament extends UserFilament {
	name?: string;
	quantity_kg?: number;
	cost_kg?: number;
	cost_approx?: number;
	product_link?: string;
	type?: string;
	temp_key?: string | number;
}

/** Payload from FilamentFormModal on save. */
export interface FilamentFormData {
	id?: string | number;
	name: string;
	brand: string;
	type: string;
	color: string;
	quantity_kg: number;
	cost_kg: number;
	product_link: string;
	material_type: string;
	cost_approx: number;
}
