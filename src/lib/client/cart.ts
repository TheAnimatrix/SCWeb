//add item removal button
//add checkout button
//check shipping cost of pincode on the fly
//quantity input should stick unless it can be finalized (qty exists in stock)

import type { CResult } from '$lib/types/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { writable, type Writable } from 'svelte/store';

//create cart type { cart_id((if signed in)/(if signed out store in localstorage)), cart_list:{product_id, quantity}[], cart_purchased }
export interface Cart {
	id: string;
	client_id?: string;
	list?: CartItem[];
	status?: string;
	price: number;
	last_updated?: string;
	updated_at?: string;
}

export type CartItem = {
	product_id: string;
	price: number;
	qty: number;
};

export interface CartG {
	valid: boolean;
	itemCount: number;
}

export const initCartG = (): Writable<CartG> => {
	return writable({
		valid: false,
		itemCount: 0
	});
};

function normalizeCartList(list: Cart['list']): CartItem[] {
	return Array.isArray(list) ? list : [];
}

function cartItemCount(cart: Cart): number {
	return normalizeCartList(cart.list).reduce((sum, item) => sum + item.qty, 0);
}

function selectActiveCart(carts: Cart[], clientId: string): Cart {
	const normalized = carts.map((cart) => ({
		...cart,
		list: normalizeCartList(cart.list)
	}));

	return normalized.sort((a, b) => {
		const aClientMatch = a.client_id === clientId ? 1 : 0;
		const bClientMatch = b.client_id === clientId ? 1 : 0;
		if (aClientMatch !== bClientMatch) return bClientMatch - aClientMatch;

		const aItems = cartItemCount(a);
		const bItems = cartItemCount(b);
		if (aItems !== bItems) return bItems - aItems;

		const aUpdated = a.updated_at ?? a.last_updated ?? '';
		const bUpdated = b.updated_at ?? b.last_updated ?? '';
		return bUpdated.localeCompare(aUpdated);
	})[0];
}

function syncCartStore(cart_store: Writable<CartG>, cart: Cart) {
	cart_store.set({ valid: true, itemCount: cartItemCount(cart) });
}

export type CartQuantityResolution =
	| { action: 'remove' }
	| { action: 'set'; qty: number }
	| { action: 'reject'; message: string }
	| { action: 'noop' };

export function resolveCartQuantityChange(params: {
	currentQty: number | undefined;
	changeQty: number;
	absoluteStockChange: boolean;
	stockLimit: number;
}): CartQuantityResolution {
	const { currentQty, changeQty, absoluteStockChange, stockLimit } = params;

	if (currentQty !== undefined) {
		const newQty = absoluteStockChange ? changeQty : currentQty + changeQty;

		if (newQty <= 0) {
			return { action: 'remove' };
		}
		if (newQty > stockLimit) {
			return {
				action: 'reject',
				message: `We only have ${stockLimit} left. You already have ${currentQty} in your cart.`
			};
		}
		return { action: 'set', qty: newQty };
	}

	if (changeQty <= 0) {
		return { action: 'noop' };
	}
	if (changeQty > stockLimit) {
		return {
			action: 'reject',
			message: `We only have ${stockLimit} left.`
		};
	}
	return { action: 'set', qty: changeQty };
}

/**
 * Changes the quantity of an item in the cart.
 * @param supabase - Supabase client
 * @param changed - The item to change in the cart, containing the product id and the new quantity
 * @returns - True if the change was successful, false if not
 */
export async function changeCart(
	supabase: SupabaseClient<any, 'public', any>,
	cart_store: Writable<CartG>,
	changed: CartItem,
	changedItemStock: number,
	clientId: string,
	absoluteStockChange: boolean
): Promise<CResult<string>> {
	if (!clientId) return Promise.resolve({ error: true, data: 'Client ID not found' });
	if (!supabase) return Promise.resolve({ error: true, data: 'Supabase client not found' });
	const cartResult: CResult<Cart | undefined> = await getActiveCart(supabase, clientId);
	if (cartResult.error)
		return Promise.resolve({ error: true, data: 'Fatal error: Cart not found' });
	const cart: Cart = cartResult.data!;
	cart.list = cart.list ?? [];
	const itemIndex = cart.list.findIndex((item) => item.product_id === changed.product_id);
	const resolution = resolveCartQuantityChange({
		currentQty: itemIndex >= 0 ? cart.list[itemIndex].qty : undefined,
		changeQty: changed.qty,
		absoluteStockChange,
		stockLimit: changedItemStock
	});

	if (resolution.action === 'reject') {
		return { error: true, data: resolution.message };
	}
	if (resolution.action === 'noop') {
		return { error: false, data: 'updated cart' };
	}
	if (itemIndex >= 0) {
		if (resolution.action === 'remove') {
			cart.list.splice(itemIndex, 1);
		} else {
			cart.list[itemIndex].qty = resolution.qty;
		}
	} else if (resolution.action === 'set') {
		cart.list.push({ ...changed, qty: resolution.qty });
	}
	const { data: updatedRows, error } = await supabase.rpc('update_cart_by_id', {
		in_client_id: clientId,
		in_cart_id: cart.id,
		in_list: cart.list,
		in_status: 'active'
	});
	if (!error && updatedRows && updatedRows.length > 0) {
		syncCartStore(cart_store, cart);
		return { error: false, data: 'updated cart' };
	}
	return {
		error: true,
		data: error?.message ?? 'Failed to update cart'
	};

	// cartg.update((cur) => {
	// 	// Find the index of the item to change in the cart list
	// 	const itemIndex = cur.list.findIndex((item) => item.product_id === changed.product_id);

	// 	// If the quantity is 0, remove the item from the cart
	// 	if (changed.qty === 0) {
	// 		if (itemIndex !== -1) {
	// 			cur.list.splice(itemIndex, 1);
	// 		}
	// 	} else {
	// 		// If the item is already in the cart, update its quantity
	// 		if (itemIndex !== -1) {
	// 			cur.list[itemIndex].qty = changed.qty;
	// 		} else {
	// 			// Otherwise, add the item to the cart with the new quantity
	// 			cur.list.push(changed);
	// 		}
	// 		cur.status = 'active';
	// 	}
	// 	return cur;
	// });

	// Push the updated cart to the online database
	// return await pushCart(supabase);
}

export function getItemFromCart(cart: Cart, product_id: string): CartItem | undefined {
	return cart.list?.find((item) => item.product_id === product_id);
}

export async function getActiveCart(
	supabase: SupabaseClient<any, 'public', any>,
	clientId: string
): Promise<CResult<Cart | undefined>> {
	const result = await supabase.rpc('get_cart_by_uid', { in_clientid: clientId });
	if (!result.error && result.data.length > 0) {
		const cart = selectActiveCart(result.data as Cart[], clientId);
		return { error: false, data: cart };
	}

	const resultCart = await supabase.from('cart').insert({ client_id: clientId, status: 'active' });
	if (!resultCart.error && resultCart.statusText == 'Created') {
		const result2 = await supabase.rpc('get_cart_by_uid', { in_clientid: clientId });
		if (!result2.error && result2.data.length > 0) {
			const cart = selectActiveCart(result2.data as Cart[], clientId);
			return { error: false, data: cart };
		}
	}
	return { error: true, data: undefined };
	// if (!result.error) {
	// 	//user not logged in, try to get cart w/ clientID
	// 	let resultCart = await supabase
	// 		.from('cart')
	// 		.select()
	// 		.eq('clientId', clientId)
	// 		.eq('status', 'active');
	// 	if (resultCart.data && resultCart.data.length > 0) {
	// 		cart = resultCart.data[0] as Cart;
	// 		return cart;
	// 	} else {
	// 		//create cart
	// 		resultCart = await supabase
	// 			.from('cart')
	// 			.insert({ clientId: clientId, status: 'active' })
	// 			.select();
	// 		cart = resultCart.data?.at(0) as Cart;
	// 		return cart;
	// 	}
	// } else {
	// 	//user logged in, try to get cart w/ userID
	// 	let resultCart = await supabase
	// 		.from('cart')
	// 		.select()
	// 		.eq('id', result.data)
	// 		.eq('status', 'active');
	// 	if (resultCart.data && resultCart.data.length > 0) {
	// 		cart = resultCart.data[0] as Cart;
	// 		return cart;
	// 	} else {
	// 		//create cart
	// 		resultCart = await supabase
	// 			.from('cart')
	// 			.insert({ uid: result.data, clientId: clientId, status: 'active' })
	// 			.select();
	// 		cart = resultCart.data?.at(0) as Cart;
	// 		return cart;
	// 	}
	// }
}

// /**
//  * Pushes the current cart to the online database or local storage.
//  *
//  * @param supabase - Supabase client object.
//  * @returns - True if the update was successful, false otherwise.
//  */
// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// export async function pushCart(supabase: SupabaseClient<any, 'public', any>): Promise<boolean> {
// 	/**
// 	 * Get the current cart data from the store.
// 	 */
// 	const cart = get(cartg);

// 	if (!supabase) return Promise.resolve(false);
// 	/**
// 	 * If the user is logged in, update the cart in the online database.
// 	 */

// 	if (cart.id && (await checkUser(supabase))) {
// 		/**
// 		 * Update the cart in the online database.
// 		 */
// 		const result = await supabase.from('cart').update(cart).eq('id', cart.id);

// 		if (!result.error) return true;
// 		else return false;
// 	} else {

// 	/**
// 	 * If the user is not logged in, push the cart to local storage.
// 	 */
// 		/**
// 		 * Attempt to set the cart to local storage.
// 		 * If this fails, return false.
// 		 */

// 		try {
// 			if (localStorage) {
// 				localStorage.setItem('cart', JSON.stringify(cart));
// 				return true;
// 			} else {
// 				return false;
// 			}
// 		} catch (e) {
// 			return false;
// 		}
// 	}
// }
