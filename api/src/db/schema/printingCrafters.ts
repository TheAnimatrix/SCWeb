import { integer, jsonb, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { makers } from './makers.js';

/** 3DP (Fabbly) capability for an approved platform maker. Subset of `makers`. */
export const printingCrafters = pgTable('PrintingCrafters', {
	makerId: uuid('maker_id')
		.primaryKey()
		.references(() => makers.id, { onDelete: 'cascade' }),
	approvedState: text('approved_state'),
	name: text('name'),
	contactNumber: text('contact_number'),
	email: text('email'),
	maxPrinterSize: text('max_printer_size'),
	numberOfPrinters: integer('number_of_printers'),
	filamentTypes: text('filament_types').array(),
	filamentData: jsonb('filament_data'),
	createdAt: timestamp('created_at', { withTimezone: true }),
	priceRank: smallint('price_rank'),
	deliveryRank: smallint('delivery_rank'),
	paymentDetails: text('payment_details')
});
