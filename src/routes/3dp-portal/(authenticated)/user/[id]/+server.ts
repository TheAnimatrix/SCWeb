import type { RequestHandler } from './$types';
import { validateAddress, type Address } from '$lib/types/product';
import { json } from '@sveltejs/kit';
import Razorpay from 'razorpay';
import { PUBLIC_RAZORPAY_ID } from '$env/static/public';
import { RAZORPAY_KEY } from '$env/static/private';
import { CLIENT_ID_COOKIE_NAME } from '$lib/constants/cookies';
import { verifyRazorpaySignature } from '$lib/server/razorpay';

const instance = new Razorpay({
	key_id: PUBLIC_RAZORPAY_ID,
	key_secret: RAZORPAY_KEY
});

function getLatestQuote(events: unknown): number | null {
	if (!Array.isArray(events)) return null;
	const quotedEvents = events
		.filter(
			(e: { type?: string; extra?: { quote?: unknown }; timestamp?: string }) =>
				e.type === 'quoted' && e.extra && typeof e.extra.quote !== 'undefined'
		)
		.sort(
			(a: { timestamp?: string }, b: { timestamp?: string }) =>
				new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()
		);
	if (quotedEvents.length === 0) return null;
	return Number(quotedEvents[0].extra.quote);
}

async function purchaseAlreadyPaid(
	supabaseAdmin: App.Locals['supabaseAdmin'],
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

export const POST = (async ({ params, request, locals }) => {
	const { supabase, supabaseAdmin } = locals;
	const { id } = params;

	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();
	if (userError || !user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { data: printRequest, error: prError } = await supabaseAdmin
		.from('printrequests')
		.select('*')
		.eq('id', id)
		.eq('user_id', user.id)
		.single();

	if (prError || !printRequest) {
		return json({ error: 'Invalid print request' }, { status: 404 });
	}

	let body: { address?: Address; amount?: number };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const address = body.address;
	const amount = body.amount;
	if (!address || typeof amount !== 'number') {
		return json({ error: 'Missing address or amount' }, { status: 400 });
	}

	const addressError = validateAddress(address);
	if (addressError) {
		return json({ error: 'Invalid address', details: addressError }, { status: 400 });
	}

	const latestQuote = getLatestQuote(printRequest.events);
	if (latestQuote === null) {
		return json({ error: 'No valid quote found for this request' }, { status: 400 });
	}

	if (Number(amount) !== Number(latestQuote)) {
		return json({ error: 'Amount does not match latest quote', latestQuote }, { status: 400 });
	}

	try {
		const paymentOrderResult = await instance.orders.create({
			amount: amount * 100,
			currency: 'INR',
			receipt: id
		});

		const { error: updateError } = await supabaseAdmin
			.from('printrequests')
			.update({
				order_id: paymentOrderResult.id,
				address: { shipping: address, billing: address },
				events: [
					...(Array.isArray(printRequest.events) ? printRequest.events : []),
					{
						by: 'user',
						type: 'order_created',
						reason: 'Payment for 3D Print Request of amount ' + amount,
						timestamp: new Date().toISOString(),
						extra: {
							amount: amount,
							order_id: paymentOrderResult.id
						}
					}
				]
			})
			.eq('id', id);

		if (updateError) {
			return json({ error: 'Error updating print request' }, { status: 500 });
		}

		return json(
			{ success: true, order_id: paymentOrderResult.id, amount: amount * 100 },
			{ status: 200 }
		);
	} catch {
		return json({ error: 'Error creating Razorpay order' }, { status: 500 });
	}
}) satisfies RequestHandler;

export const PATCH = (async ({ params, request, locals, cookies }) => {
	const { supabase, supabaseAdmin } = locals;
	const { id } = params;

	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();
	if (userError || !user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { data: printRequest, error: prError } = await supabaseAdmin
		.from('printrequests')
		.select('*')
		.eq('id', id)
		.eq('user_id', user.id)
		.single();

	if (prError || !printRequest) {
		return json({ error: 'Invalid print request' }, { status: 404 });
	}

	if (printRequest.request_stage === 'paid') {
		return json({ success: true }, { status: 200 });
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json({ error: 'Invalid form data' }, { status: 400 });
	}

	const payment_id_a = formData.get('payment_id_a');
	const payment_id_b = formData.get('payment_id_b');
	const payment_signature = formData.get('payment_signature');

	if (
		!payment_id_a ||
		typeof payment_id_a !== 'string' ||
		!payment_id_b ||
		typeof payment_id_b !== 'string' ||
		!payment_signature ||
		typeof payment_signature !== 'string'
	) {
		return json({ error: 'Missing payment parameters' }, { status: 400 });
	}

	if (!verifyRazorpaySignature(payment_id_a, payment_id_b, payment_signature, RAZORPAY_KEY)) {
		return json({ error: 'Invalid payment signature' }, { status: 400 });
	}

	if (printRequest.order_id && printRequest.order_id !== payment_id_a) {
		return json({ error: 'Order id mismatch' }, { status: 400 });
	}

	if (!printRequest.order_id) {
		return json({ error: 'No payment order found for this request' }, { status: 400 });
	}

	if (await purchaseAlreadyPaid(supabaseAdmin, payment_id_b)) {
		return json({ success: true }, { status: 200 });
	}

	const latestQuote = getLatestQuote(printRequest.events);
	if (latestQuote === null) {
		return json({ error: 'No valid quote found for this request' }, { status: 400 });
	}

	const purchaseInsert = {
		payment_status: 'paid',
		payment_method: 'razorpay:PrintRequest',
		payment_id: payment_id_a,
		payment_id_b: payment_id_b,
		billing_address: printRequest.address?.billing,
		shipping_address: printRequest.address?.shipping,
		client_id: cookies.get(CLIENT_ID_COOKIE_NAME) ?? 'N/A',
		cart_id: id,
		amount: latestQuote,
		uid: user.id
	};

	const { error: purchaseError } = await supabaseAdmin.from('purchases').insert([purchaseInsert]);
	if (purchaseError) {
		if (purchaseError.code === '23505') {
			return json({ success: true }, { status: 200 });
		}
		return json({ error: 'Error adding purchase record' }, { status: 500 });
	}

	const newEvent = {
		by: 'user',
		type: 'paid',
		reason: 'Payment verified for 3D Print Request',
		timestamp: new Date().toISOString(),
		extra: {
			payment_id_a,
			payment_id_b,
			amount: latestQuote
		}
	};

	const updatedEvents = Array.isArray(printRequest.events)
		? [...printRequest.events, newEvent]
		: [newEvent];

	const { error: updateError } = await supabaseAdmin
		.from('printrequests')
		.update({
			events: updatedEvents,
			request_stage: 'paid',
			order_id: payment_id_a,
			payment_id: payment_id_b
		})
		.eq('id', id)
		.neq('request_stage', 'paid');

	if (updateError) {
		return json({ error: 'Error updating print request' }, { status: 500 });
	}

	return json({ success: true }, { status: 200 });
}) satisfies RequestHandler;
