# @scweb/api

Hono API workspace for the Selfcrafted split.

## Database schema

Run introspection when `POSTGRES_URL` (or `DATABASE_URL`) is reachable:

```bash
npm run db:pull -w @scweb/api
```

Generated tables land in `src/db/schema/`. If the database is unreachable, the checked-in hand-written definitions in `src/db/schema/cart.ts` and `src/db/schema/products.ts` mirror `supabase/types.ts` and the SvelteKit `Product` type. Re-run `db:pull` when connectivity is restored and replace the fallback files with the introspected output.

### Money units

All integer money columns (`orders.subtotal`, `orders.delivery_fee`, `orders.total`, `order_items.unit_price`) store **whole INR rupees**, matching legacy `cart.price` and `products.price.new`. Conversion to paise happens only at the Razorpay API boundary (×100). Use `rupeesToPaise()` from `src/contracts/money.ts` for that conversion.
