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
