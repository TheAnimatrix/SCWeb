import { pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const userFilament = pgTable('UserFilament', {
	id: uuid('id').primaryKey().defaultRandom(),
	brand: text('brand'),
	materialType: text('material_type').notNull(),
	density: real('density'),
	costApprox: real('cost_approx'),
	productLink: text('product_link'),
	maxFlowRate: real('max_flow_rate'),
	ownerId: uuid('owner_id').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }),
	name: text('name'),
	quantityKg: real('quantity_kg'),
	color: text('color')
});
