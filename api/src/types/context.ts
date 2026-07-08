import type { User } from '@supabase/supabase-js';
import type { Env } from '../env.js';
import type { Database } from '../db/index.js';
import type { CartStore } from '../services/cart-store.js';

export type Actor = {
	userId: string | null;
	clientId: string | null;
};

export type AppVariables = {
	env: Env;
	db: Database;
	cartStore: CartStore;
	requestId: string;
	actor: Actor;
	user: User | null;
};
