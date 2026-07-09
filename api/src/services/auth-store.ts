import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { and, eq, sql } from 'drizzle-orm';
import type { Env } from '../env.js';
import type { Database } from '../db/index.js';
import { users } from '../db/schema/users.js';
import type {
	PasswordResetConfirmBody,
	PasswordResetRequestBody,
	SignupBody
} from '../contracts/auth.js';
import {
	renderAccountWelcomeEmail,
	renderPasswordResetEmail
} from './email-templates/index.js';
import type { MailService } from './mail.js';
import { storeLog } from '../middleware/logging.js';

export type AuthStore = ReturnType<typeof createAuthStore>;

export type AuthResult<T> =
	| { ok: true; data: T }
	| { ok: false; status: number; body: { error: string; message?: string } };

function createAdminClient(env: Env): SupabaseClient {
	if (!env.SUPABASE_SERVICE_ROLE_KEY) {
		throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for auth mail routes');
	}

	return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

export function isAuthMailConfigured(env: Env): boolean {
	return Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function isUsernameTaken(
	db: Database,
	username: string,
	excludeUserId?: string
): Promise<boolean> {
	const conditions = [sql`lower(${users.username}) = lower(${username})`];
	if (excludeUserId) {
		conditions.push(sql`${users.id} <> ${excludeUserId}::uuid`);
	}

	const [existing] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(...conditions))
		.limit(1);

	return Boolean(existing);
}

export function createAuthStore(db: Database, env: Env, mail: MailService) {
	return {
		async signup(body: SignupBody): Promise<AuthResult<{ needsConfirmation: boolean }>> {
			const admin = createAdminClient(env);
			const siteUrl = mail.siteUrl;

			if (await isUsernameTaken(db, body.username)) {
				return {
					ok: false,
					status: 409,
					body: { error: 'username_taken', message: 'Username not available' }
				};
			}

			const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
				type: 'signup',
				email: body.email,
				password: body.password,
				options: {
					redirectTo: `${siteUrl}/user/profile`
				}
			});

			if (linkError || !linkData.user) {
				storeLog('error', 'auth.signup.generate_link_failed', {
					email: body.email,
					message: linkError?.message ?? 'missing user'
				});

				if (linkError?.message?.toLowerCase().includes('already registered')) {
					return {
						ok: false,
						status: 409,
						body: { error: 'email_taken', message: 'An account with this email already exists' }
					};
				}

				return {
					ok: false,
					status: 500,
					body: { error: 'signup_failed', message: 'Could not create account' }
				};
			}

			const userId = linkData.user.id;

			const updated = await db
				.update(users)
				.set({ username: body.username })
				.where(eq(users.id, userId))
				.returning({ id: users.id });

			if (updated.length === 0) {
				await db
					.insert(users)
					.values({
						id: userId,
						username: body.username,
						email: body.email,
						createdAt: new Date().toISOString()
					})
					.onConflictDoUpdate({
						target: users.id,
						set: {
							username: body.username,
							email: body.email
						}
					});
			}

			const confirmUrl = linkData.properties.action_link;
			const template = renderAccountWelcomeEmail({
				siteUrl,
				username: body.username,
				confirmUrl
			});

			mail.send(body.email, template, { kind: 'auth.signup' });

			return { ok: true, data: { needsConfirmation: true } };
		},

		async requestPasswordReset(
			body: PasswordResetRequestBody
		): Promise<AuthResult<{ message: string }>> {
			const genericMessage =
				'If an account exists for that email, we sent password reset instructions.';

			const admin = createAdminClient(env);

			const { data: linkData, error } = await admin.auth.admin.generateLink({
				type: 'recovery',
				email: body.email,
				options: {
					redirectTo: `${mail.siteUrl}/user/reset-password`
				}
			});

			if (error || !linkData.properties?.action_link) {
				storeLog('info', 'auth.password_reset.skipped', {
					email: body.email,
					message: error?.message ?? 'no action link'
				});
				return { ok: true, data: { message: genericMessage } };
			}

			const resetUrl = linkData.properties.hashed_token
				? `${mail.siteUrl}/user/reset-password?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}`
				: linkData.properties.action_link;

			const template = renderPasswordResetEmail({
				siteUrl: mail.siteUrl,
				resetUrl
			});

			mail.send(body.email, template, { kind: 'auth.password_reset' });

			return { ok: true, data: { message: genericMessage } };
		},

		async confirmPasswordReset(
			body: PasswordResetConfirmBody
		): Promise<AuthResult<{ message: string }>> {
			const admin = createAdminClient(env);

			const { data: verifyData, error: verifyError } = await admin.auth.verifyOtp({
				type: 'recovery',
				token_hash: body.tokenHash
			});

			if (verifyError || !verifyData.user) {
				return {
					ok: false,
					status: 400,
					body: {
						error: 'invalid_token',
						message: 'This reset link is invalid or has expired'
					}
				};
			}

			const { error: updateError } = await admin.auth.admin.updateUserById(verifyData.user.id, {
				password: body.password
			});

			if (updateError) {
				storeLog('error', 'auth.password_reset.update_failed', {
					userId: verifyData.user.id,
					message: updateError.message
				});
				return {
					ok: false,
					status: 500,
					body: { error: 'update_failed', message: 'Could not update password' }
				};
			}

			return { ok: true, data: { message: 'Password updated. You can sign in now.' } };
		},

		async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
			return !(await isUsernameTaken(db, username, excludeUserId));
		}
	};
}
