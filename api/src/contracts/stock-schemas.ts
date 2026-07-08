import { z } from 'zod';

export const productStockSchema = z.object({
	count: z.number(),
	status: z.string().nullable()
});
