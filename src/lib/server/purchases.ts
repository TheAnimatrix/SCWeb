import type { TypedSupabaseClient } from '$lib/types/database';

/** True when a paid purchase already exists for the given Razorpay payment id. */
export async function purchaseAlreadyPaid(
	supabaseAdmin: TypedSupabaseClient,
	paymentIdB: string
): Promise<boolean> {
	const { data } = await supabaseAdmin
		.from('purchases')
		.select('id')
		.eq('payment_id_b', paymentIdB)
		.eq('payment_status', 'paid')
		.maybeSingle();
	return data != null;
}
