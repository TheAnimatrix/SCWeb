import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../supabase/types';

export type { Database };

export type TypedSupabaseClient = SupabaseClient<Database>;

export type DbRow<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Row'];

export type DbInsert<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Insert'];

export type ChatMessage = DbRow<'Chat'>;
export type CreatorReview = DbRow<'CreatorReviews'>;
export type CreatorStats = DbRow<'CreatorStats'>;
export type UserFilament = DbRow<'UserFilament'>;
export type FilamentCatalog = DbRow<'Filament'>;
export type PrintingCrafter = DbRow<'PrintingCrafters'>;

export type ProductsSelectQuery = ReturnType<ReturnType<TypedSupabaseClient['from']>['select']>;
