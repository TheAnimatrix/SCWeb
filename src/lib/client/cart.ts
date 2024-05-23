//add item removal button
//add checkout button
//check shipping cost of pincode on the fly
//quantity input should stick unless it can be finalized (qty exists in stock)

import { checkUser } from '$lib/client/user';
import type { SupabaseClient } from '@supabase/supabase-js';
import { get, writable } from 'svelte/store';

//create cart type { cart_id((if signed in)/(if signed out store in localstorage)), cart_list:{product_id, quantity}[], cart_purchased }
interface Cart {
	id?: string;
	list: CartItem[];
	status?: string;
	price: number;
	last_updated?: string;
}

export type CartItem = {
	product_id: string;
	price:number;
	qty: number;
};

export const cartg = writable<Cart>();
cartg.set({ list: [], price: 0, status: 'active' });

/**
 * Changes the quantity of an item in the cart.
 * @param supabase - Supabase client
 * @param changed - The item to change in the cart, containing the product id and the new quantity
 * @returns - True if the change was successful, false if not
 */
export async function changeCart(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	supabase: SupabaseClient<any, 'public', any>,
	changed: CartItem
): Promise<boolean> {
	// If the Supabase client is invalid, return false
	if (!supabase) return Promise.resolve(false);
	console.log("ccart:cartg",get(cartg));
	console.log(changed);
	// Update the cart in the store
	cartg.update((cur) => {
		// Find the index of the item to change in the cart list
		const itemIndex = cur.list.findIndex((item) => item.product_id === changed.product_id);
		console.log("ccart:existing_pid?:"+itemIndex);

		// If the quantity is 0, remove the item from the cart
		if (changed.qty === 0) {
			if (itemIndex !== -1) {
				cur.list.splice(itemIndex, 1);
				console.log("ccart:remove old item");
			}
		} else {
			// If the item is already in the cart, update its quantity
			if (itemIndex !== -1) {
				cur.list[itemIndex].qty = changed.qty;
				console.log("ccart:changing qty",changed.qty);
			} else {
				// Otherwise, add the item to the cart with the new quantity
				cur.list.push(changed);
				console.log("ccart:add new item",changed);
			}
			cur.status = "active";
		}
		return cur;
	});

	// Push the updated cart to the online database
	return await pushCart(supabase);
}


//on - new session ? (INITIAL_SESSION)
/**
 * Pull the cart data from online or local storage
 * @param supabase - Supabase client
 * @returns - True if the cart was successfully pulled, false if not
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function pullCart(supabase: SupabaseClient<any, 'public', any>): Promise<boolean> {
	if (!supabase) return Promise.resolve(false);
	console.log("pullcart:start")
	// If the user is logged in, obtain the cart data from online
	if (await checkUser(supabase)) {
		console.log("pullCart:checkUser");
		// Get the cart from the online database
		const result = await supabase.from('cart').select().eq('status', 'active');
		if (result.data && result.data.length > 0) {
			// Set the cart data to the store
			cartg.set(result.data[0] as Cart);
			return true;
		} else {
			// If the cart is empty, create a new one
			const id = await supabase
				.from('cart')
				.insert(get(cartg) ?? {})
				.select();
			// Set the ID to the store
			cartg.update((cur) => {
				cur.id = id.data?.at(0).id ?? undefined;
				return cur;
			});
			return false;
		}
	} else {
		// If the user is not logged in, get the cart from local storage
		try {
			if(localStorage)
				console.log("pullcart_localstorage_a");
			else
				console.log("pullcart_localstorage_b")
			if (localStorage) {
				const lc = localStorage.getItem("cart");
				console.log("pullcart_localstorage_c",lc);
				if (lc) {
					// Set the cart data from local storage to the store
					cartg.set(JSON.parse(lc) as Cart);
					return true;
				} else {
					return false;
				}
			} else {
				return false;
			}
		} catch (e) {
			return false;
		}
	}
}

/**
 * Pushes the current cart to the online database or local storage.
 * 
 * @param supabase - Supabase client object.
 * @returns - True if the update was successful, false otherwise.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function pushCart(supabase: SupabaseClient<any, 'public', any>): Promise<boolean> {
	/**
	 * Get the current cart data from the store.
	 */
	const cart = get(cartg);
	console.log("pushCart:sp",cart,(!supabase||!cart.id));
	if (!supabase) return Promise.resolve(false);
	/**
	 * If the user is logged in, update the cart in the online database.
	 */
	console.log("rchd_1");
	if (cart.id && await checkUser(supabase)) {
		console.log("rchd_2");
		/**
		 * Update the cart in the online database.
		 */
		const result = await supabase.from('cart').update(cart).eq('id', cart.id);
		console.log("pushcart:result",result);
		if (!result.error) return true;
		else return false;
	}

	/**
	 * If the user is not logged in, push the cart to local storage.
	 */
	else {
		console.log("rchd_3");
		/**
		 * Attempt to set the cart to local storage.
		 * If this fails, return false.
		 */
		console.log("pushCart:loggedout",cart);
		try {
			if (localStorage) {
				localStorage.setItem('cart', JSON.stringify(cart));
				return true;
			} else {
				return false;
			}
		} catch (e) {
			return false;
		}
	}
}