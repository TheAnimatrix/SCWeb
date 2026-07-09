import { z } from 'zod';

const passwordSchema = z
	.string()
	.min(8, 'Password should be at least 8 characters long')
	.regex(
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
		'Password must include uppercase, lowercase, and a number'
	);

export { passwordSchema };

export const signupBodySchema = z.object({
	email: z.string().email(),
	password: passwordSchema,
	username: z
		.string()
		.min(3)
		.max(30)
		.regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores')
});

export const passwordResetRequestBodySchema = z.object({
	email: z.string().email()
});

export const passwordResetConfirmBodySchema = z.object({
	tokenHash: z.string().min(1, 'Reset link is invalid or has expired'),
	password: passwordSchema
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

export const signupResponseSchema = z.object({
	needsConfirmation: z.boolean()
});

export const passwordResetRequestResponseSchema = z.object({
	message: z.string()
});

export const passwordResetConfirmResponseSchema = z.object({
	message: z.string()
});

export type SignupBody = z.infer<typeof signupBodySchema>;
export type PasswordResetRequestBody = z.infer<typeof passwordResetRequestBodySchema>;
export type PasswordResetConfirmBody = z.infer<typeof passwordResetConfirmBodySchema>;
