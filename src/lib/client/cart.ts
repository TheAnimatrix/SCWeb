//add item removal button
//add checkout button
//check shipping cost of pincode on the fly
//quantity input should stick unless it can be finalized (qty exists in stock)

import type { CResult } from '$lib/types/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import {  writable, type Writable } from 'svelte/store';

//create cart type { cart_id((if signed in)/(if signed out store in localstorage)), cart_list:{product_id, quantity}[], cart_purchased }
export interface Cart {
	id: string;
	list?: CartItem[];
	status?: string;
	price: number;
	last_updated?: string;
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

/**
 * Changes the quantity of an item in the cart.
 * @param supabase - Supabase client
 * @param changed - The item to change in the cart, containing the product id and the new quantity
 * @returns - True if the change was successful, false if not
 */
export async function changeCart(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
	if (itemIndex >= 0) {
		const sameCartItem = cart.list[itemIndex];
		let newQty;
		if(!absoluteStockChange)
			newQty = (sameCartItem?.qty ?? 0) + changed.qty;
		else
			newQty = changed.qty;
		if (newQty === 0) {
			cart.list.splice(itemIndex, 1);
		} else if(newQty> changedItemStock){
			return { error: true, data: `We only have ${changedItemStock} left. You already have ${sameCartItem.qty} in your cart.` };
		}
		else{
			cart.list[itemIndex].qty = newQty;
		}
	} else {
		cart.list.push(changed);
	}
	const { error } = await supabase.rpc('update_cart_by_id', {
		in_client_id: clientId,
		in_cart_id: cart.id,
		in_list: cart.list,
		in_status: 'active'
	});
	if (!error) {
		let itemCount = 0;
		cart.list?.forEach((item) => {
			itemCount += item.qty;
		});
		cart_store.set({ valid: false, itemCount: itemCount });
		return { error: false, data: 'updated cart' };
	} else {
		return { error: true, data: error.message };
	}

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
	let cart: Cart;
	if (!result.error && result.data.length > 0) {
		cart = result.data[0] as Cart;
		return { error: false, data: cart };
	} else {
		//create cart
		const resultCart = await supabase
			.from('cart')
			.insert({ client_id: clientId, status: 'active' });
		if (!resultCart.error && resultCart.statusText == 'Created') {
			const result2 = await supabase.rpc('get_cart_by_uid', { in_clientid: clientId });
			if (!result2.error && result2.data.length > 0) {
				cart = result2.data[0] as Cart;
				return { error: false, data: cart };
			} else return { error: true, data: undefined };
		} else return { error: true, data: undefined };
	}
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
