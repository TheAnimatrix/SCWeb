<script lang="ts">
	import { error } from '@sveltejs/kit';
	import { validateAddress, type Address } from '$lib/types/product';
	import AddressInputSelector from '$lib/components/fundamental/AddressInputSelector.svelte';
	import { goto } from '$app/navigation';
	import GlowButton from '$lib/components/fundamental/GlowButton.svelte';
	import { type CartG, type Cart } from '$lib/client/cart';
	import { browser } from '$app/environment';
	import { getContext, onMount } from 'svelte';
	import { setLoading } from '$lib/client/loading';
	import { type Writable } from 'svelte/store';
	import { PUBLIC_RAZORPAY_ID } from '$env/static/public';
	export let data;
	let cartData: Cart;
	let subtotal = 0;
	let validAddress: Address;
	function calcSubTotal() {
		let total = 0;
		cartData?.list?.forEach((item) => {
			total += item.price * item.qty;
		});
		return total;
	}
	$: {
		if (data.cart && !data.cart.error) {
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

	let cart_store = getContext<Writable<CartG>>('userCartStatus');
	let load_store = getContext<Writable<boolean>>('loading');
	async function payNow() {
		setLoading(load_store, true);
		const formData = new FormData();
		formData.append('orderId', cartData.id);
		formData.append('address', JSON.stringify(validAddress));
		const result = await fetch('/checkout/createOrder', { method: 'POST', body: formData });
		try {
			console.log(result);
			const dataResult = await result.json();
			if (!dataResult || dataResult.error) {
				//handle error
				return;
			}
			var options = {
				key: PUBLIC_RAZORPAY_ID, // Enter the Key ID generated from the Dashboard
				amount: dataResult.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
				currency: 'INR',
				name: 'SelfCrafted',
				image:
					'https://pfeewicqoxkuwnbuxnoz.supabase.co/storage/v1/object/public/images/favicon.png',
				order_id: dataResult.orderId, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
				handler: async function (response) {
					const formData2 = new FormData();
					formData2.append('payment_id_a', response.razorpay_order_id);
					formData2.append('payment_id_b', response.razorpay_payment_id);
					formData2.append('payment_signature', response.razorpay_signature);
					const result = await fetch('/checkout/createOrder', { method: 'PATCH', body: formData2 });
					cart_store.set({ valid: false, itemCount: 0 });
					goto(`/summary/success/${cartData.id}/${response.razorpay_payment_id}`);
					setLoading(load_store, false);
				},
				modal: {
					ondismiss: function () {
						setLoading(load_store, false);
					}
				},
				prefill: {},
				theme: {
					color: '#2084fe'
				}
			};
			var rzp1 = new Razorpay(options);
			if (!rzp1) {
				alert('Issue with Payment Provider, try again');
				setLoading(load_store, false);
				return;
			}
			rzp1.open();
			rzp1.on('payment.failed', function (response) {
				setLoading(load_store, false);
				rzp1.close();
				window.location.href = `/summary/failure/${cartData.id}/${response.error.metadata.order_id}`;
				// goto(`/summary/failure/${cartData.id}/${response.error.metadata.order_id}`,{invalidateAll:true});
			});
			rzp1.on('payment.success', function (response) {
				goto(`/summary/success/${cartData.id}/${response.razorpay_payment_id}`);
			});
		} catch (e) {
			console.log(e);
			setLoading(load_store,false);
			return;
		}
	}
</script>

<svelte:head>
	<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</svelte:head>

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
			bind:address={validAddress}
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
						on:click={payNow}>
						<div class="px-8 py-1">Pay Now</div>
					</GlowButton>
				</div>
			</div>
		</div>
	</div>
</div>
