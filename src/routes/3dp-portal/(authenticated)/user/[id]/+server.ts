import type { RequestHandler } from './$types';
import { validateAddress, type Address, type Orders } from '$lib/types/product';
import { error, json } from '@sveltejs/kit';

import Razorpay from 'razorpay';
import { PUBLIC_RAZORPAY_ID } from '$env/static/public';
import { RAZORPAY_KEY } from '$env/static/private';
const instance = new Razorpay({
	key_id: PUBLIC_RAZORPAY_ID,
	key_secret: RAZORPAY_KEY
});


/**
 * Handles payment processing for 3D print requests.
 * 
 * POST endpoint expects JSON body with address and amount.
 * 
 * Workflow:
 * 1. Validates the print request belongs to the authenticated user
 * 2. Validates the provided address
 * 3. Verifies the payment amount matches the latest quote
 * 4. Creates a Razorpay order
 * 5. Updates the print request with payment details
 * 
 * Supabase tables accessed:
 * - printrequests: Reads to validate the request and updates with payment details
 * 
 * @param {Object} context - SvelteKit request context
 * @param {import('@sveltejs/kit').RequestEvent} context.locals - Contains supabase clients
 * @param {Object} context.params - URL parameters including print request ID
 * @param {Request} context.request - The incoming request object with address and amount
 * @returns {Response} JSON response with order details or error
 */

export const POST = (async ({ params, request, locals }) => {
    // 1. Check if params.id is a valid printrequest and obtain details
    const { supabase, supabaseServer } = locals;
    const { id } = params;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch the print request (ensure user owns it)
    const { data: printRequest, error: prError } = await supabaseServer
        .from('printrequests')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (prError || !printRequest) {
        return json({ error: 'Invalid print request' }, { status: 404 });
    }

    // 2. Parse body for address and amount
    let body: any;
    try {
        body = await request.json();
    } catch (e) {
        return json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const address: Address = body.address;
    const amount: number = body.amount;
    if (!address || typeof amount !== 'number') {
        return json({ error: 'Missing address or amount' }, { status: 400 });
    }

    // 3. Validate address
    const addressError = validateAddress(address);
    if (addressError) {
        return json({ error: 'Invalid address', details: addressError }, { status: 400 });
    }

    // 4. Get latest quote from printRequest.events
    let latestQuote: number | null = null;
    if (Array.isArray(printRequest.events)) {
        // Find the latest 'quoted' event
        const quotedEvents = printRequest.events
            .filter((e: any) => e.type === 'quoted' && e.extra && typeof e.extra.quote !== 'undefined')
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (quotedEvents.length > 0) {
            latestQuote = Number(quotedEvents[0].extra.quote);
        }
    }
    if (latestQuote === null) {
        return json({ error: 'No valid quote found for this request' }, { status: 400 });
    }

    // 5. Compare supplied amount with latest quote
    if (Number(amount) !== Number(latestQuote)) {
        return json({ error: 'Amount does not match latest quote', latestQuote }, { status: 400 });
    }

    // 6. Create Razorpay Order
    // 7. Update PrintRequest with Order ID
    try{
        const paymentOrderResult = await instance.orders.create({
				amount: amount * 100,
				currency: 'INR',
				receipt: id
			});
        const { data: printRequest2, error: prError } = await supabaseServer
        .from('printrequests')
        .update({
            order_id: paymentOrderResult.id,
            address : {"shipping" : address, "billing" : address},
            events: [...printRequest.events, {
                by : 'user',
                type: 'order_created',
                reason : 'Payment for 3D Print Request of amount ' + amount,
                timestamp: new Date().toISOString(),
                extra: {
                    amount : amount,
                    order_id: paymentOrderResult.id
                }
            }]
        })
        .eq('id', id);
        if(prError){
            return json({ error: 'Error updating print request' }, { status: 500 });
        }
        return json({ success: true, order_id: paymentOrderResult.id, amount: amount *100}, { status: 200 });

    }catch(err){
        return json({ error: 'Error creating Razorpay order' }, { status: 500 });
    }
}) satisfies RequestHandler;




/**
 * Handles payment confirmation and order finalization for 3D print requests.
 *
 * PATCH endpoint expects form data with payment_id_a (order_id), payment_id_b (payment_id), 
 * payment_signature, and amount.
 *
 * Supabase tables accessed:
 * - printrequests: Updates payment details, events, and request_stage to 'paid'.
 * - purchases: Inserts a new purchase record after successful payment.
 *
 * Flow:
 * 1. Verifies user authentication
 * 2. Validates print request exists and belongs to user
 * 3. Processes payment confirmation details
 * 4. Updates print request with payment information
 * 5. Creates purchase record for accounting/history
 *
 * @param {Object} context - SvelteKit request context
 * @param {Object} context.params - URL parameters including print request ID
 * @param {Request} context.request - The incoming request object with form data
 * @param {Object} context.locals - Contains supabase and supabaseServer clients
 * @param {Object} context.cookies - Cookie access for client identification
 * @returns {Response} JSON response indicating success or error
 */
export const PATCH = (async ({ params, request, locals, cookies }) => {
    const { supabase, supabaseServer } = locals;
    const { id } = params;

    // 1. Verify user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Verify print request exists for user
    const { data: printRequest, error: prError } = await supabaseServer
        .from('printrequests')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
    if (prError || !printRequest) {
        return json({ error: 'Invalid print request' }, { status: 404 });
    }

    // 3. Get formdata
    let formData;
    try {
        formData = await request.formData();
    } catch (e) {
        return json({ error: 'Invalid form data' }, { status: 400 });
    }
    const payment_id_a = formData.get('payment_id_a');
    const payment_id_b = formData.get('payment_id_b');
    const payment_signature = formData.get('payment_signature');
    const amountParam = formData.get('amount');
    if (!payment_id_a || !payment_id_b || !payment_signature || !amountParam) {
        return json({ error: 'Missing payment parameters' }, { status: 400 });
    }

    // 4. Update print request events & request_stage
    const newEvent = {
        by: 'user',
        type: 'paid',
        reason: 'Payment verified for 3D Print Request',
        timestamp: new Date().toISOString(),
        extra: {
            payment_id_a,
            payment_id_b,
            payment_signature,
            amount: amountParam
        }
    };
    const updatedEvents = Array.isArray(printRequest.events) ? [...printRequest.events, newEvent] : [newEvent];
    const { error: updateError } = await supabaseServer
        .from('printrequests')
        .update({
            events: updatedEvents,
            request_stage: 'paid',
            order_id: payment_id_a,
            payment_id: payment_id_b
        })
        .eq('id', id);
    if (updateError) {
        return json({ error: 'Error updating print request' }, { status: 500 });
    }

    // 5. Add purchase record to purchases table
    // Use print_request_id instead of cart_id
    // For payment method, append ':PrintRequest' to the method
    const amount = printRequest.events && printRequest.events.length > 0
        ? (printRequest.events
            .filter((e: any) => e.type === 'quoted' && e.extra && typeof e.extra.quote !== 'undefined')
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.extra.quote || Number(amountParam)/100)
        : Number(amountParam)/100;
    const purchaseInsert = {
        payment_status: 'paid',
        payment_method: 'razorpay:PrintRequest',
        payment_id: payment_id_a,
        payment_id_b: payment_id_b,
        payment_signature: payment_signature,
        billing_address : printRequest.address.billing,
        shipping_address : printRequest.address.shipping,
        client_id : cookies.get('CLIENT_ID_COOKIE_NAME') ?? "N/A",
        cart_id: id, // print_request_id
        amount
    };
    const { error: purchaseError } = await supabase
        .from('purchases')
        .insert([purchaseInsert]);
    if (purchaseError) {
        return json({ error: 'Error adding purchase record' }, { status: 500 });
    }

    return json({ success: true }, { status: 200 });
}) satisfies RequestHandler;