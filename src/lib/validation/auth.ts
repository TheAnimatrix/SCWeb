import { z } from 'zod';

/** Mirrors api/src/contracts/auth.ts — kept in src/ to avoid /api/* proxy collisions in the browser. */
export const passwordSchema = z
	.string()
	.min(
		8,
		'Your password needs 8 or more characters, with an uppercase letter, a lowercase letter and a number.'
	)
	.regex(
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
		'Your password needs 8 or more characters, with an uppercase letter, a lowercase letter and a number.'
	);

export const passwordResetRequestBodySchema = z.object({
	email: z.string().email()
});

export const passwordResetConfirmFormSchema = z
	.object({
		tokenHash: z
			.string()
			.min(1, 'This reset link has expired or was already used. Request a new one.'),
		password: passwordSchema,
		confirmPassword: passwordSchema
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "The passwords don't match.",
		path: ['confirmPassword']
	});
