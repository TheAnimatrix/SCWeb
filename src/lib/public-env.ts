import { env } from '$env/dynamic/public';

function requirePublicEnv(name: keyof typeof env): string {
	const value = env[name];
	if (!value) {
		throw new Error(
			`${name} is not set. Configure it as a runtime environment variable (Dokploy application env).`
		);
	}
	return value;
}

/** Runtime public env — read from process.env (adapter-node), not baked at Docker build time. */
export const publicEnv = {
	get supabaseUrl() {
		return requirePublicEnv('PUBLIC_SUPABASE_URL');
	},
	get supabaseKey() {
		return requirePublicEnv('PUBLIC_SUPABASE_KEY');
	},
	get razorpayId() {
		return requirePublicEnv('PUBLIC_RAZORPAY_ID');
	},
	get isProduction() {
		return env.PUBLIC_IS_PRODUCTION !== 'false';
	}
};
