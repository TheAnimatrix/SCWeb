import { zValidator } from '@hono/zod-validator';
import type { ZodSchema } from 'zod';

export function validateJson<T extends ZodSchema>(schema: T) {
	return zValidator('json', schema);
}

export function validateQuery<T extends ZodSchema>(schema: T) {
	return zValidator('query', schema);
}

export function validateParam<T extends ZodSchema>(schema: T) {
	return zValidator('param', schema);
}

export function validateForm<T extends ZodSchema>(schema: T) {
	return zValidator('form', schema);
}
