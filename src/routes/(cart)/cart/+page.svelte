<script lang="ts">
	import { loading } from '$lib/stores/loading';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import IconCheckout from '$lib/svg/icon-checkout.svelte';
	import IconOrderSummary from '$lib/svg/icon-order-summary.svelte';
	import { cartg, pullCart, pushCart, changeCart } from '$lib/stores/cart.js';
	import { onMount } from 'svelte';
	import GlowButton from '$lib/components/fundamental/GlowButton.svelte';
	export let data;
	let checkoutHover = false;

	async function getItemDetails(itemId: string) {
		const result = await data.supabase_lt.from('products').select('*').eq('id', itemId);
		if (result.data && result.data[0]) {
			console.log(result.data[0]);
			return result.data[0];
		} else {
			return null;
		}
	}

	function calcSubTotal() {
		let total = 0;
		$cartg.list.forEach((item) => {
			total += item.price * item.qty;
		});
		return total;
	}
	let subtotal = 0;
	onMount(() => {
		setup();
		cartg.subscribe(() => {
			subtotal = calcSubTotal();
		});
	});

	async function setup() {
		$loading = true;
		console.log('setup:cart');
		await pullCart(data.supabase_lt);
		$loading = false;
	}
</script>

<div class="flex flex-wrap mt-4 gap-x-3 mb-4">
	<div class="cart flex flex-col flex-[3_0_66%] gap-y-4 mb-4">
		{#if $cartg.list.length}
			{#each $cartg.list as productItem, i}
				{#await getItemDetails(productItem.product_id)}
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
									alt=""
								/>
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
								class="flex flex-wrap text-center gap-x-8 gap-y-2 mr-8 my-4 max-sm:my-2 max-sm:mx-2 max-sm:gap-x-4 h-fit items-end justify-end"
							>
								<div class="text-xl max-sm:text-md">₹{result.price.new}</div>
								<div>
									<form
										on:submit={(p) => {
											let inputElement = document.getElementById('qtyInput' + i);
											let iVal = +inputElement?.value ?? 0;
											console.log('form:stock:', result.stock.count, iVal, typeof iVal);
											if (typeof iVal === 'number' && iVal <= result.stock.count) {
												let p = $cartg.list[i];
												p.qty = iVal;
												changeCart(data.supabase_lt, p);
											} else {
												alert('not enough stock!');
												inputElement.value = '';
											}
										}}
									>
										<input
											id="qtyInput{i}"
											type="number"
											placeholder={productItem.qty.toString()}
											class="min-w-[50px] w-[50px] bg-scblued1 text-center border-[1px] border-scblue rounded-md placeholder-scblue"
										/>
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
					<GlowButton
						disabled={$cartg.list.length == 0}
						on:click={() => {
							goto('/checkout');
						}}
					>
						<div class="px-8 py-1">Checkout</div>
					</GlowButton>
				</div>
			</div>
		</div>
	</div>
</div>
