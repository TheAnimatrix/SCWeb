<script lang="ts">
	import { setLoading } from '$lib/client/loading.js';
	import { goto, invalidate } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import IconCheckout from '$lib/svg/icon-checkout.svelte';
	import IconOrderSummary from '$lib/svg/icon-order-summary.svelte';
	import { getContext, onDestroy, onMount } from 'svelte';
	import GlowButton from '$lib/components/fundamental/GlowButton.svelte';
	import type { Unsubscriber, Writable } from 'svelte/store';
	import {
		getActiveCart,
		type CartItem,
		type Cart,
		type CartG,
		changeCart
	} from '$lib/client/cart';
	export let data;
	let checkoutHover = false;
	let cartData: Cart;

	if (!data.cart.error) {
		cartData = data.cart.data!;
	}

	async function getItemDetails(itemId: string,x:any) {
		const result = await data.supabase_lt.from('products').select('*').eq('id', itemId);
		if (result.data && result.data[0]) {
			return result.data[0];
		} else {
			return null;
		}
	}

	function calcSubTotal(data:any) {
		let total = 0;
		cartData?.list?.forEach((item) => {
			total += item.price * item.qty;
		});
		return total;
	}

	const cart_store = getContext<Writable<CartG>>('userCartStatus');
	let load_store = getContext<Writable<boolean>>('loading');
	async function editQuantity(k: any, i: number, result: any) {
		let inputElement = document.getElementById(`qtyInput${i}`) as HTMLInputElement;
		let iVal = +inputElement?.value ?? 0;

		if (typeof iVal === 'number' && iVal <= result.stock.count) {
			let p = cartData.list![i];
			p.qty = iVal;
			setLoading(load_store, true);
			const changeResult = await changeCart(data.supabase_lt, cart_store, p, result.stock.count, data.clientId,true);
			await invalidate('cart:change');
			setLoading(load_store, false);
		} else {
			alert('not enough stock!');
			inputElement.value = '';
		}
	}

	$: subtotal = calcSubTotal(data);
</script>

<div class="flex flex-wrap mt-4 gap-x-3 mb-4">
	<div class="cart flex flex-col flex-[3_0_66%] gap-y-4 mb-4">
		{#if cartData && (cartData.list ?? [])?.length > 0}
			{#each cartData.list ?? [] as productItem, i}
				{#await getItemDetails(productItem.product_id,data.cart.data?.list?.[i])}
					<div class="bg-scblued2 p-2 rounded-xl">
						<div class="cart-item flex border-[1px] border-scblue rounded-lg p-6 font-semibold">
							Loading
						</div>
					</div>
				{:then result}
					<div class="bg-scblued2 p-2 rounded-xl">
						<div class="cart-item flex border-[1px] border-scblue rounded-lg">
							<div>
								<img
									src={result.images[0].url}
									class="min-h-full max-h-[180px] aspect-[1.2] rounded-lg object-cover"
									alt="" />
							</div>
							<div class="flex-1 flex flex-col p-4 max-sm:p-2">
								<div class="max-sm:text-xl text-2xl font-bold pr-2">{result.name}</div>
								<div class="max-sm:text-sm text-xl font-bold text-scblue">by {result.author}</div>
								<div class="flex-1"></div>
								<div class="max-sm:hidden text-xs font-bold text-scbluel0 opacity-60">
									15 days SCOriginal Guarantee
								</div>
							</div>
							<div
								class="flex flex-wrap text-center gap-x-8 gap-y-2 mr-8 my-4 max-sm:my-2 max-sm:mx-2 max-sm:gap-x-4 h-fit items-end justify-end">
								<div class="text-xl max-sm:text-md">₹{result.price.new}</div>
								<div>
									<form on:submit={(p) => editQuantity(p, i, result)}>
										<input
											id="qtyInput{i}"
											type="number"
											placeholder={productItem.qty.toString()}
											class="min-w-[50px] w-[50px] bg-scblued1 text-center border-[1px] border-scblue rounded-md placeholder-scblue" />
									</form>
								</div>
								<div class="font-bold text-xl max-sm:text-lg">
									₹{result.price.new * productItem.qty}
								</div>
							</div>
						</div>
					</div>
				{:catch err}
					<div class="bg-scblued2 p-2 rounded-xl">
						<div class="cart-item flex border-[1px] border-scblue rounded-lg p-6 font-semibold">
							Unknown error occured
						</div>
					</div>
				{/await}
			{/each}
		{:else}
			<div class="bg-scblued2 p-2 rounded-xl">
				<div class="cart-item flex border-[1px] border-scblue rounded-lg p-6 font-semibold">
					No items in cart
				</div>
			</div>
		{/if}
	</div>
	<div class="flex-[1_1_25%]">
		<div class="w-full bg-scblued2 p-2 rounded-xl">
			<div class="flex flex-col bg-scblued1 w-full rounded-xl border-scblue border-[1px] py-2">
				<div class="flex justify-between px-3 pb-2">
					<div class="mt-2">Subtotal</div>
					<div class="mt-2">₹{subtotal}</div>
				</div>
				<div class="flex justify-between py-2 px-3 bg-scblued3">
					<div>
						<div>Shipping</div>
					</div>
					<div class="text-end">
						<div>₹99</div>
						<div>Flat Rate</div>
						<div>India-Wide</div>
					</div>
				</div>
				<div class="flex justify-between mt-2 py-2 px-3">
					<div class="text-xl font-bold">Total</div>
					<div class="text-xl font-bold">₹{subtotal + 99}</div>
				</div>
				<div class="flex justify-center p-2">
					<!-- <GlowButton
						disabled={$cartg.list.length == 0}
						on:click={() => {
							goto('/checkout');
						}}
					>
						<div class="px-8 py-1">Checkout</div>
					</GlowButton> -->
				</div>
			</div>
		</div>
	</div>
</div>
