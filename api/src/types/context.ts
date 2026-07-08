import type { User } from '@supabase/supabase-js';
import type { Env } from '../env.js';
import type { Database } from '../db/index.js';

export type Actor = {
	userId: string | null;
	clientId: string | null;
};

export type AppVariables = {
	env: Env;
	db: Database;
	requestId: string;
	actor: Actor;
	user: User | null;
};
