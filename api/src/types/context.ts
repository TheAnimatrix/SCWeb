import type { User } from '@supabase/supabase-js';
import type { Env } from '../env.js';
import type { Database } from '../db/index.js';
import type { CartStore } from '../services/cart-store.js';
import type { CheckoutStore } from '../services/checkout-store.js';
import type { PrintFilesStore } from '../services/print-files-store.js';
import type { ChatsStore } from '../services/chats-store.js';
import type { PrintPaymentsStore } from '../services/print-payments-store.js';
import type { PrintRequestsStore } from '../services/print-requests-store.js';
import type { CatalogStore } from '../services/catalog-store.js';

export type Actor = {
	userId: string | null;
	clientId: string | null;
};

export type AppVariables = {
	env: Env;
	db: Database;
	cartStore: CartStore;
	checkoutStore: CheckoutStore;
	printFilesStore: PrintFilesStore | null;
	printPaymentsStore: PrintPaymentsStore;
	printRequestsStore: PrintRequestsStore;
	chatsStore: ChatsStore;
	catalogStore: CatalogStore;
	requestId: string;
	actor: Actor;
	user: User | null;
};
