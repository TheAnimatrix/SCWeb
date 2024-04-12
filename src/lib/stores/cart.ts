//add item removal button
//add checkout button
//check shipping cost of pincode on the fly
//quantity input should stick unless it can be finalized (qty exists in stock)

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

type CartItem = {
	product_id: string;
	qty: number;
};

export const cartg = writable<Cart>();
cartg.set({ list: [], price: 0, status: 'empty' });

export async function changeCart(
	supabase: SupabaseClient<any, 'public', any>,
	changed: CartItem
): Promise<boolean> {
	if (!supabase) return Promise.resolve(false);
	//change item
	cartg.update((cur) => {
		const itemIndex = cur.list.findIndex((item) => item.product_id === changed.product_id);
		if (changed.qty == 0) {
			// Remove item if quantity is 0
			if (itemIndex !== -1) {
				cur.list.splice(itemIndex, 1);
			}
		} else {
			if (itemIndex !== -1) {
				cur.list[itemIndex].qty = changed.qty;
			} else {
				cur.list.push(changed);
			}
		}
		return cur;
	});
	//push to db
	return await pushCart(supabase);
}

//on - new session ? (INITIAL_SESSION)
export async function pullCart(supabase: SupabaseClient<any, 'public', any>): Promise<boolean> {
	if (!supabase) return Promise.resolve(false);
	if (await checkUser(supabase)) {
		//logged in, obtain from online
		const result = await supabase.from('cart').select().eq('status', 'empty');
		if (result.data && result.data.length > 0) {
			cartg.set(result.data[0] as Cart);
			return true;
		} else {
			const id = await supabase
				.from('cart')
				.insert(get(cartg) ?? {})
				.select();
			cartg.update((cur) => {
				cur.id = id.data?.at(0).id ?? undefined;
				return cur;
			});
			return false;
		}
	} else {
		//get from localstorage
		try {
			if (localStorage) {
				const lc = localStorage.get('cart');
				if (lc) {
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

//on
//new addition to cart
//removal from cart
//quantity changes
export async function pushCart(supabase: SupabaseClient<any, 'public', any>): Promise<boolean> {
	const cart = get(cartg);
	if (!supabase || !cart.id) return Promise.resolve(false);

	if (await checkUser(supabase)) {
		const result = await supabase.from('cart').update(cart).eq('id', cart.id);
		if (!result.error) return true;
		else return false;
	} else {
		//push to localstorage
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

export async function checkUser(supabase: SupabaseClient<any, 'public', any>): Promise<boolean> {
	if (!supabase) return Promise.resolve(false);
	const {
		data: { session }
	} = await supabase.auth.getSession();
	if (session != null && session) return true;
	else return false;
}
