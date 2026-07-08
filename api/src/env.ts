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
	RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
	RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120)
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
