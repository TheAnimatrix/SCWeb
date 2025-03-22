<script lang="ts">
	import { run } from 'svelte/legacy';

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
	import { DELIVERY_FLAT_FEE } from '$lib/constants/numbers.js';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from '@iconify/svelte';
	
	let { data } = $props();
	let cartData: Cart = $state();
	let subtotal = $state(0);
	let validAddress: Address = $state();
	
	// Cache for product details to avoid repeated lookups
	let productDetailsCache: Record<string, any> = {};
	
	async function getProductDetails(productId: string) {
		// Use cached data if available
		if (productDetailsCache[productId]) {
			return productDetailsCache[productId];
		}
		
		const result = await data.supabase_lt.from('products').select('name,images,price,author').eq('id', productId);
		if (result.data && result.data[0]) {
			console.log('Product details:', result.data[0]);
			// Cache the result
			productDetailsCache[productId] = result.data[0];
			return result.data[0];
		} else {
			return null;
		}
	}
	
	function calcSubTotal() {
		let total = 0;
		cartData?.list?.forEach((item) => {
			total += item.price * item.qty;
		});
		console.log('Calculated subtotal:', total);
		return total;
	}
	
	// Debug function for payment issue
	function debugPaymentCalculation() {
		console.log('=== DEBUG PAYMENT CALCULATION ===');
		console.log('Cart Data:', cartData);
		console.log('Cart Items:', cartData?.list);
		console.log('Delivery Fee:', DELIVERY_FLAT_FEE);
		
		let calculatedTotal = 0;
		cartData?.list?.forEach((item, index) => {
			const itemTotal = item.price * item.qty;
			console.log(`Item ${index}: ${item.product_id} - Price: ${item.price} × Qty: ${item.qty} = ${itemTotal}`);
			calculatedTotal += itemTotal;
		});
		
		console.log('Calculated Subtotal:', calculatedTotal);
		console.log('Final Total:', calculatedTotal + DELIVERY_FLAT_FEE);
		console.log('============================');
		
		return calculatedTotal;
	}
	
	// Call the debug function when subtotal is recalculated
	run(() => {
		if (data.cart && !data.cart.error) {
			cartData = data.cart.data!;
			subtotal = calcSubTotal();
			// Debug calculation
			const debugTotal = debugPaymentCalculation();
			if (subtotal !== debugTotal) {
				console.error('MISMATCH IN CALCULATION!', { subtotal, debugTotal });
			}
			console.log('DELIVERY_FLAT_FEE:', DELIVERY_FLAT_FEE);
			console.log('Final total:', subtotal + DELIVERY_FLAT_FEE);
		}
	});
	
	let addressValid: boolean = $state(false);
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
				handler: async function (response: any) {
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
			// @ts-ignore - Razorpay is loaded from external script
			var rzp1 = new Razorpay(options);
			if (!rzp1) {
				alert('Issue with Payment Provider, try again');
				setLoading(load_store, false);
				return;
			}
			rzp1.open();
			rzp1.on('payment.failed', function (response: any) {
				setLoading(load_store, false);
				rzp1.close();
				window.location.href = `/summary/failure/${cartData.id}/${response.error.metadata.order_id}`;
				// goto(`/summary/failure/${cartData.id}/${response.error.metadata.order_id}`,{invalidateAll:true});
			});
			rzp1.on('payment.success', function (response: any) {
				goto(`/summary/success/${cartData.id}/${response.razorpay_payment_id}`);
			});
		} catch (e) {
			setLoading(load_store,false);
			return;
		}
	}
</script>

<svelte:head>
	<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</svelte:head>

<div class="min-h-screen bg-[#0c0c0c] text-white">
	<div class="container mx-auto px-4 py-12">
		<!-- Page Header -->
		<div class="text-center mb-10" in:fly="{{ y: -20, duration: 600, delay: 200, easing: cubicOut }}">
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-4 h-4 rounded-full bg-accent mr-2"></span>
				<span class="text-accent text-sm uppercase tracking-wider font-medium">Checkout</span>
			</div>
			<h1 class="text-4xl font-bold mb-2">Complete Your Order</h1>
			<p class="text-gray-400">Almost there! Add your shipping details to complete your purchase</p>
		</div>

		<!-- Main Content -->
		<div class="flex flex-col lg:flex-row gap-8 mb-16" in:fly="{{ y: 20, duration: 400, delay: 300, easing: cubicOut }}">
			<!-- Checkout Form -->
			<div class="lg:w-2/3 space-y-6 flex-1">
				<div class="bg-[#151515]/40 backdrop-blur-xs rounded-2xl border border-[#252525] p-6 transition-all duration-300 hover:shadow-glow">
					{#if !data.userExists}
						<div id="loginOption" class="flex flex-col mb-6">
							<div class="flex items-center gap-2 mb-3">
								<Icon icon="ph:user-circle-bold" class="text-accent text-xl" />
								<span class="text-white font-medium">Account Benefits</span>
							</div>
							<p class="text-gray-400 mb-4">Sign in for faster checkout, detailed order tracking, saved addresses, and exclusive offers!</p>
							<GlowButton class="w-fit! h-fit! mb-2" onclick={() => goto('/user/sign')}>
								<div class="px-6 py-1 flex items-center gap-2">
									<Icon icon="ph:sign-in-bold" />
									Login or Register
								</div>
							</GlowButton>
						</div>
						<div class="relative py-3 my-6">
							<div class="absolute inset-0 flex items-center">
								<div class="w-full border-t border-[#353535]"></div>
							</div>
							<div class="relative flex justify-center">
								<span class="bg-[#151515] px-4 text-sm text-gray-400">Continue as guest</span>
							</div>
						</div>
					{/if}
					
					<!-- Address Section with Title -->
					<div class="mb-4">
						<div class="flex items-center gap-2 mb-4">
							<Icon icon="ph:map-pin-bold" class="text-accent text-xl" />
							<h2 class="text-lg font-medium">Shipping Address</h2>
						</div>
						<AddressInputSelector
							email={data.email}
							userExists={data.userExists}
							addresses={data.addresses}
							bind:address={validAddress}
							bind:addressValid />
					</div>
				</div>
				
	
			</div>

			<!-- Order Summary -->
			<div class="lg:w-1/3">
				<div class="relative bg-[#151515]/30 backdrop-blur-md rounded-2xl border border-[#252525] overflow-hidden sticky top-4 transition-all duration-300 hover:shadow-glow"
					in:fade={{ duration: 200, delay: 300 }}>
					<div class="p-5 border-b border-[#252525]">
						<h2 class="text-xl font-bold flex items-center">
							<Icon icon="ph:receipt-bold" class="mr-2 text-accent" />
							Order Summary
						</h2>
					</div>
					
					<div class="p-5 space-y-4">
						{#if cartData?.list && cartData.list.length > 0}
							<div class="max-h-60 overflow-y-auto pr-2 scrollbar mb-4">
								{#each cartData.list as item}
									{#await getProductDetails(item.product_id)}
										<div class="flex items-center justify-between py-2 border-b border-[#252525]/50">
											<div class="flex items-center gap-3">
												<div class="text-accent font-medium w-6 h-6 flex items-center justify-center bg-accent/10 rounded-full">
													{item.qty}
												</div>
												<div class="w-6 h-6 bg-[#252525] rounded-md animate-pulse"></div>
												<div class="text-sm truncate max-w-[180px] text-gray-400">
													Loading...
												</div>
											</div>
											<div class="font-medium">₹{item.price * item.qty}</div>
										</div>
									{:then product}
										<div class="flex items-center justify-between py-2 border-b border-[#252525]/50">
											<div class="flex items-center gap-3 flex-1">
												<div class="text-accent font-medium w-6 h-6 flex items-center justify-center bg-accent/10 rounded-full">
													{item.qty}
												</div>
												{#if product && product.images && product.images.length > 0}
													<div class="w-8 h-8 overflow-hidden rounded-md">
														<img 
															src={product.images[0].url} 
															alt={product.name}
															class="w-full h-full object-cover"
															loading="lazy"
														/>
													</div>
												{:else}
													<div class="w-8 h-8 bg-[#252525] rounded-md flex items-center justify-center">
														<Icon icon="ph:cube-bold" class="text-xs text-accent/50" />
													</div>
												{/if}
												<div class="flex flex-col">
													<div class="text-sm truncate max-w-[150px]">
														{product ? product.name : `Item #${item.product_id.substring(0, 8)}`}
													</div>
													{#if product && product.author}
														<div class="text-xs text-accent/70">{product.author}</div>
													{/if}
													<div class="text-xs text-gray-400">
														Price: ₹{item.price} × {item.qty}
													</div>
												</div>
											</div>
											<div class="font-medium pl-2">₹{item.price * item.qty}</div>
										</div>
									{/await}
								{/each}
							</div>
						{/if}
						
						<div class="flex justify-between items-center">
							<span class="text-gray-400">Subtotal</span>
							<span class="font-medium">₹{subtotal.toFixed(2)}</span>
						</div>
						
						<div class="flex justify-between items-center pb-4 border-b border-[#252525]">
							<div>
								<span class="text-gray-400">Shipping</span>
								<div class="text-xs text-gray-500">India-Wide Flat Rate</div>
							</div>
							<span class="font-medium">₹{DELIVERY_FLAT_FEE}</span>
						</div>
						
						<div class="flex justify-between items-center pt-1">
							<span class="text-lg font-bold">Total</span>
							<span class="text-2xl font-bold text-accent">
								₹{(subtotal + DELIVERY_FLAT_FEE).toFixed(2)}
							</span>
						</div>
						
						<button
							class={`w-full mt-5 relative group/button overflow-hidden ${(!addressValid || (cartData?.list ?? []).length <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
							disabled={(cartData?.list ?? []).length <= 0 || !addressValid}
							onclick={payNow}
						>
							<div class="absolute inset-0 bg-accent opacity-10 group-hover/button:opacity-20 transition-opacity duration-300"></div>
							
							<div class="relative flex items-center justify-center gap-2 bg-transparent border border-accent/30 rounded-xl px-5 py-3 font-medium text-accent">
								<Icon icon="ph:credit-card-bold" />
								<span>Proceed to Payment</span>
								
								<div class="absolute right-4 opacity-0 group-hover/button:opacity-100 transform group-hover/button:translate-x-1 transition-all duration-300">
									<Icon icon="ph:arrow-right-bold" />
								</div>
							</div>
						</button>
						
						<div class="text-center mt-3">
							<button 
								class="text-sm text-gray-400 hover:text-white transition-colors duration-300 flex items-center justify-center gap-1 mx-auto"
								onclick={() => goto('/cart')}
							>
								<Icon icon="ph:arrow-left-bold" />
								Return to Cart
							</button>
						</div>
						
						<div class="pt-4 border-t border-[#252525] flex items-center justify-center gap-3 text-gray-500">
							<Icon icon="ph:shield-check-bold" class="text-accent opacity-50" />
							<span class="text-xs">Secure Checkout</span>
							<Icon icon="ph:lock-simple-bold" class="text-accent opacity-50" />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.shadow-glow {
		@apply [box-shadow:0_4px_20px_-5px_var(--color-accent)/10];
	}

	/* Scrollbar styling */
	.scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	
	.scrollbar::-webkit-scrollbar-track {
		background: #252525;
		border-radius: 10px;
	}
	
	.scrollbar::-webkit-scrollbar-thumb {
		background: var(--color-accent);
		border-radius: 10px;
		opacity: 0.5;
	}
	
	.scrollbar::-webkit-scrollbar-thumb:hover {
		background: var(--color-accent);
		opacity: 0.7;
	}
</style>
