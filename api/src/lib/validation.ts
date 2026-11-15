import { zValidator } from '@hono/zod-validator';
import type { Context, Env } from 'hono';
import type { ZodError, ZodIssue, ZodSchema } from 'zod';

/** Field names whose plain label differs from the key. */
const FIELD_LABELS: Record<string, string> = {
	price_new: 'Price',
	price_old: 'Original price',
	stock_count: 'Stock',
	display_name: 'Display name',
	product_id: 'Product',
	storefront_state: 'Visibility'
};

/** Turns a field path such as ['tagline'] into "Tagline". */
function fieldLabel(path: (string | number)[]): string | null {
	const key = [...path].reverse().find((part): part is string => typeof part === 'string');
	if (!key) return null;
	if (FIELD_LABELS[key]) return FIELD_LABELS[key];
	const words = key.replace(/_/g, ' ').trim();
	if (!words) return null;
	return words.charAt(0).toUpperCase() + words.slice(1);
}

function plural(count: number | bigint, word: string): string {
	return `${count} ${word}${Number(count) === 1 ? '' : 's'}`;
}

/** Builds one plain sentence describing a zod issue, for showing to the person who filled the form. */
export function describeValidationIssue(issue: ZodIssue): string {
	const label = fieldLabel(issue.path);
	const subject = label ?? 'This value';

	switch (issue.code) {
		case 'invalid_type':
			if (issue.received === 'undefined' || issue.received === 'null') {
				return `${subject} is required.`;
			}
			if (issue.expected === 'integer') return `${subject} must be a whole number.`;
			return `${subject} is not valid.`;
		case 'too_small':
			if (issue.type === 'string') {
				return Number(issue.minimum) <= 1
					? `${subject} is required.`
					: `${subject} must be at least ${plural(issue.minimum, 'character')}.`;
			}
			if (issue.type === 'array' || issue.type === 'set') {
				return `${subject} needs at least ${plural(issue.minimum, 'item')}.`;
			}
			if (issue.type === 'number' || issue.type === 'bigint') {
				return issue.inclusive
					? `${subject} must be ${issue.minimum} or more.`
					: `${subject} must be more than ${issue.minimum}.`;
			}
			return `${subject} is too short.`;
		case 'too_big':
			if (issue.type === 'string') {
				return `${subject} must be ${plural(issue.maximum, 'character')} or fewer.`;
			}
			if (issue.type === 'array' || issue.type === 'set') {
				return `${subject} can have at most ${plural(issue.maximum, 'item')}.`;
			}
			if (issue.type === 'number' || issue.type === 'bigint') {
				return issue.inclusive
					? `${subject} must be ${issue.maximum} or less.`
					: `${subject} must be less than ${issue.maximum}.`;
			}
			return `${subject} is too long.`;
		case 'invalid_enum_value':
		case 'invalid_literal':
		case 'invalid_union':
		case 'invalid_union_discriminator':
			return `${subject} is not one of the allowed options.`;
		default:
			return label ? `${label} is not valid.` : 'Some of the details are not valid.';
	}
}

/** Response body for a failed validation. `error` stays a string code so clients can switch on it. */
export function validationErrorBody(error: ZodError) {
	const first = error.issues[0];
	return {
		error: 'invalid_payload' as const,
		message: first ? describeValidationIssue(first) : 'Some of the details are not valid.',
		issues: error.issues.map((issue) => ({ path: issue.path, code: issue.code }))
	};
}

/** zValidator hook: answers a failed validation with a plain `message`. */
export function validationHook<E extends Env, P extends string>(
	result: { success: boolean; error?: ZodError },
	c: Context<E, P>
) {
	if (!result.success && result.error) {
		return c.json(validationErrorBody(result.error), 400);
	}
}

export function validateJson<T extends ZodSchema>(schema: T) {
	return zValidator('json', schema, validationHook);
}

export function validateQuery<T extends ZodSchema>(schema: T) {
	return zValidator('query', schema, validationHook);
}

export function validateParam<T extends ZodSchema>(schema: T) {
	return zValidator('param', schema, validationHook);
}

export function validateForm<T extends ZodSchema>(schema: T) {
	return zValidator('form', schema, validationHook);
}
