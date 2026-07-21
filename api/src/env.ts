import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
	API_PORT: z.coerce.number().int().positive().default(3001),
	DATABASE_URL: z.string().min(1),
	SUPABASE_URL: z.string().url(),
	SUPABASE_ANON_KEY: z.string().min(1),
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
	API_CORS_ORIGINS: z.string().default('http://localhost:5173'),
	CLIENT_ID_COOKIE_NAME: z.string().default('clientId'),
	CLIENT_ID_SIGNING_SECRET: z.string().min(1).optional(),
	PUBLIC_RAZORPAY_ID: z.string().min(1).optional(),
	// Razorpay KEY SECRET (name kept for parity with the web app's .env).
	RAZORPAY_KEY: z.string().min(1).optional(),
	RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
	RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
	RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
	SMTP_HOST: z.string().min(1).optional(),
	SMTP_PORT: z.coerce.number().int().positive().default(587),
	SMTP_USER: z.string().optional(),
	SMTP_PASS: z.string().optional(),
	SMTP_SECURE: z
		.preprocess(
			(value) => value === 'true' || value === '1' || value === true,
			z.boolean()
		)
		.default(false),
	EMAIL_FROM: z.string().default('Selfcrafted <noreply@selfcrafted.in>'),
	ORDERS_INBOX_EMAIL: z.string().email().default('orders@selfcrafted.in'),
	SITE_URL: z.string().url().optional(),
	PUBLIC_SITE_URL: z.string().url().optional(),
	/** Comma-separated user UUIDs allowed to review makers/listings. */
	STAFF_USER_IDS: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
	const parsed = envSchema.safeParse(process.env);

	if (!parsed.success) {
		const details = parsed.error.issues
			.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
			.join('\n');
		throw new Error(`Invalid API environment:\n${details}`);
	}

	return parsed.data;
}

export function getCorsOrigins(env: Env): string[] {
	return env.API_CORS_ORIGINS.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);
}

export function getSiteUrl(env: Env): string {
	return (env.SITE_URL ?? env.PUBLIC_SITE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}

export function isSmtpConfigured(env: Env): boolean {
	return Boolean(env.SMTP_HOST && env.SMTP_PASS);
}

/** Resend and most providers: 465 = implicit TLS; 587 = plain + STARTTLS. */
export function resolveSmtpSecure(env: Pick<Env, 'SMTP_PORT' | 'SMTP_SECURE'>): boolean {
	if (env.SMTP_PORT === 465) {
		return true;
	}

	if (env.SMTP_PORT === 587 || env.SMTP_PORT === 25) {
		return false;
	}

	return env.SMTP_SECURE;
}

export function getSmtpTransportSummary(env: Pick<Env, 'SMTP_HOST' | 'SMTP_PORT' | 'SMTP_SECURE'>) {
	return {
		host: env.SMTP_HOST ?? null,
		port: env.SMTP_PORT,
		secure: resolveSmtpSecure(env)
	};
}
