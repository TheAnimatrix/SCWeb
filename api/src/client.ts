import { hc } from 'hono/client';
import type { AppType } from './app.js';

export function createApiClient(baseUrl: string, options?: Parameters<typeof hc>[1]) {
	return hc<AppType>(baseUrl, options);
}

export type ApiClient = ReturnType<typeof createApiClient>;
