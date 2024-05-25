<script lang="ts">
	import { validateAddress } from '$lib/types/product';
	import AddressInputSelector from '$lib/components/fundamental/AddressInputSelector.svelte';
	import { goto } from '$app/navigation';
	import GlowButton from '$lib/components/fundamental/GlowButton.svelte';
	import type { Cart } from '$lib/client/cart';
	export let data;
	let cartData: Cart;
	let subtotal = 0;
	function calcSubTotal() {
		let total = 0;
		cartData?.list?.forEach((item) => {
			total += item.price * item.qty;
		});
		return total;
	}
	$: {
		if (!data.cart.error) {
			cartData = data.cart.data!;
			subtotal = calcSubTotal();
		}
	}
	let addressValid: boolean = false;
	if (data.userExists && data.addresses && data.addresses.length > 0) {
		if (validateAddress(data.addresses[0])) {
			addressValid = true;
		}
	}
</script>

<div class="flex flex-wrap mt-4 gap-x-3 mb-4">
	<div class="cart flex flex-col flex-[3_0_66%] gap-y-4 mb-4">
		{#if !data.userExists}
			<div id="loginOption" class="flex flex-col">
				<span class="text-scbluel1 font-medium text-sm">Would you like to login first ?</span>
				<GlowButton class="!w-fit !h-fit my-2" on:click={() => goto('/user/sign')}>
					<div class="px-6 py-1">Login</div>
				</GlowButton>
				<span class="text-scbluel1 font-medium text-sm"
					>Detailed Order tracking, Save Address, Order History, Offers & More!</span>
			</div>
			<hr class="h-[1px] border-scblued3 flex-1 mr-4" />
		{/if}
		<AddressInputSelector
			supabase={data.supabase_lt}
			userExists={data.userExists}
			addresses={data.addresses}
			bind:addressValid />
		<div class="flex w-full px-16 items-center">
			<div class="h-[6px] w-[6px] bg-scblue rotate-45" />
			<hr class="h-[1px] border-scblue flex-1" />
			<div class="h-[6px] w-[6px] bg-scblue rotate-45" />
		</div>
	</div>
	<div class="flex-[1_1_25%]">
		<div class="w-full bg-scblued2 p-2 rounded-xl">
			<div class="flex flex-col bg-scblued1 w-full rounded-xl border-scblue border-[1px] py-2">
				<div class="flex justify-between px-3 pb-2">
					<div class="mt-2">Subtotal</div>
					<div class="mt-2">₹{subtotal}</div>
				</div>
				<div class="flex flex-col justify-between py-2 px-3 bg-scblued3">
					<div class="flex justify-between">
						<div>Shipping</div>
						<div>₹99</div>
					</div>
					<div class="text-start w-full">
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
						disabled={(cartData.list ?? []).length <= 0 || !addressValid}
						on:click={() => {
							goto('/checkout');
						}}>
						<div class="px-8 py-1">Pay Now</div>
					</GlowButton>
				</div>
			</div>
		</div>
	</div>
</div>
