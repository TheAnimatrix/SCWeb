/** True when cart/checkout DB tables are applied and the API service is reachable. */
export const dbReady = process.env.E2E_DB_READY === '1';
