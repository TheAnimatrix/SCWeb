// Prefer `npm run db:pull -w @scweb/api` when POSTGRES_URL is reachable.
// Hand-written fallback mirrors supabase/types.ts and src/lib/types/product.ts.

export { cart } from './cart.js';
export { products } from './products.js';
