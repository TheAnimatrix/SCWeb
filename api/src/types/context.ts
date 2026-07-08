import type { User } from '@supabase/supabase-js';
import type { Env } from '../env.js';
import type { Database } from '../db/index.js';
import type { CartStore } from '../services/cart-store.js';
import type { CheckoutStore } from '../services/checkout-store.js';

export type Actor = {
	userId: string | null;
	clientId: string | null;
};

export type AppVariables = {
	env: Env;
	db: Database;
	cartStore: CartStore;
	checkoutStore: CheckoutStore;
	requestId: string;
	actor: Actor;
	user: User | null;
};
