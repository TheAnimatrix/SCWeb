import type { Env } from '../env.js';

export const emailEnvDefaults = {
	SMTP_PORT: 587,
	SMTP_SECURE: false,
	EMAIL_FROM: 'Selfcrafted <noreply@selfcrafted.in>',
	ORDERS_INBOX_EMAIL: 'orders@selfcrafted.in'
} satisfies Pick<Env, 'SMTP_PORT' | 'SMTP_SECURE' | 'EMAIL_FROM' | 'ORDERS_INBOX_EMAIL'>;
