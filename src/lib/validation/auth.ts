import { z } from 'zod';

/** Mirrors api/src/contracts/auth.ts — kept in src/ to avoid /api/* proxy collisions in the browser. */
export const passwordSchema = z
	.string()
	.min(8, 'Password should be at least 8 characters long')
	.regex(
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
		'Password must include uppercase, lowercase, and a number'
	);

export const passwordResetRequestBodySchema = z.object({
	email: z.string().email()
});

export const passwordResetConfirmFormSchema = z
	.object({
		tokenHash: z.string().min(1, 'Reset link is invalid or has expired'),
		password: passwordSchema,
		confirmPassword: passwordSchema
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	});
