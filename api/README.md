# @scweb/api

Hono API workspace for the Selfcrafted split.

## Database schema

Run introspection when `POSTGRES_URL` (or `DATABASE_URL`) is reachable:

```bash
npm run db:pull -w @scweb/api
```

Generated tables land in `src/db/schema/`. If the database is unreachable, the checked-in hand-written definitions in `src/db/schema/cart.ts` and `src/db/schema/products.ts` mirror `supabase/types.ts` and the SvelteKit `Product` type. Re-run `db:pull` when connectivity is restored and replace the fallback files with the introspected output.
