import {
	passwordResetConfirmFormSchema,
	passwordResetRequestBodySchema
} from '$lib/validation/auth';

export function validatePasswordResetRequest(email: string): string | null {
	const result = passwordResetRequestBodySchema.safeParse({ email });
	if (result.success) return null;
	return result.error.issues[0]?.message ?? 'Enter a valid email address';
}

export function validatePasswordResetConfirm(input: {
	tokenHash: string;
	password: string;
	confirmPassword: string;
}): string | null {
	const result = passwordResetConfirmFormSchema.safeParse(input);
	if (result.success) return null;
	return result.error.issues[0]?.message ?? 'Invalid password';
}
