<script lang="ts">
	import type { Order, Orders, Product } from '$lib/types/product.js';
	import {} from '$lib/client/loading.js';
	import type { CartItem } from '$lib/client/cart.js';
	import Icon from '@iconify/svelte';

	let { data } = $props();
	let supabase_lt = data.supabase_lt;
	let subload = false;
	let orders: Orders = $state([]);
	orders = data.orders;
	let visible = $state(Array(orders.length).fill(false));

	function getDate(timestamp: string) {
		const date = new Date(timestamp);
		const day = date.getDate();
		const suffix = getDaySuffix(day);
		const month = date.toLocaleDateString('en-US', { month: 'long' });
		const year = date.getFullYear();
		return `${day}${suffix} ${month} ${year}`;
	}

	function getDaySuffix(day: number) {
		if (day >= 11 && day <= 13) return 'th';
		const lastDigit = day % 10;
		switch (lastDigit) {
			case 1: return 'st';
			case 2: return 'nd';
			case 3: return 'rd';
			default: return 'th';
		}
	}

	function getTime(timestamp: string) {
		return new Date(timestamp).toLocaleTimeString('en-IN', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function getStatusColor(status: string) {
		switch (status.toLowerCase()) {
			case 'completed':
				return 'text-green-400';
			case 'pending':
				return 'text-yellow-400';
			case 'failed':
				return 'text-red-400';
			default:
				return 'text-gray-400';
		}
	}

	async function getCartDetails(id: string | null) {
		if (!id) return {cart: undefined, products: undefined, price: 0, shipping: 0};
		const cartResult = await supabase_lt.from('cart').select().eq('id', id);
		if (cartResult.error || cartResult.data.length <= 0 || cartResult.data?.[0].list.length <= 0)
			return {cart: undefined, products: undefined, price: 0, shipping: 0};
		
		const productList: Product[] = [];
		let total = 0;
		for (let cart of cartResult.data?.[0].list) {
			total += cart.price;
			const productResult = await supabase_lt.from('products').select().eq('id', cart.product_id);
			if (productResult.error || productResult.data.length <= 0) 
				return {cart: undefined, products: undefined, price: 0, shipping: 0};
			productResult.data[0].qty = cart.qty;
			productList.push(productResult.data[0]);
		}
		return { 
			cart: cartResult.data[0].list, 
			products: productList, 
			shipping: cartResult.data[0].price - total, 
			price: cartResult.data[0].price
		};
	}
</script>

<div class="space-y-6">
	{#if orders == undefined || orders.length <= 0 || subload}
		<div class="bg-[#151515] rounded-xl p-8 text-center">
			<Icon icon="ph:shopping-bag-bold" class="text-4xl text-gray-400 mx-auto mb-4" />
			{#if subload}
				<p class="text-gray-400">Loading your orders...</p>
			{:else}
				<p class="text-gray-400">No orders placed yet</p>
				<a href="/shop" class="inline-block mt-4 px-6 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-all">
					Start Shopping
				</a>
			{/if}
		</div>
	{:else}
		{#each orders as order, i}
			<div class="bg-[#151515] rounded-xl overflow-hidden">
				<button
					class="w-full p-3 md:p-4 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 items-start text-left hover:bg-white/5 transition-all"
					onclick={() => {
						visible = visible.with(i, !visible[i]);
					}}
				>
					<div class="space-y-1 md:col-span-1">
						<div class="text-xs md:text-sm text-gray-400">Order ID</div>
						<div class="font-medium text-sm md:text-base break-all">{order.id}</div>
					</div>
					
					<div class="space-y-1">
						<div class="text-xs md:text-sm text-gray-400">Status</div>
						<div class="font-medium text-sm md:text-base capitalize {getStatusColor(order.payment_status)}">
							<span class="flex items-center gap-1.5 md:gap-2">
								<Icon icon={order.payment_status.toLowerCase() === 'completed' ? 'ph:check-circle' : 'ph:clock'} />
								{order.payment_status}
							</span>
						</div>
					</div>
					
					<div class="space-y-1">
						<div class="text-xs md:text-sm text-gray-400">Date</div>
						<div class="font-medium text-sm md:text-base">{getDate(order.created_at)}</div>
						<div class="text-xs text-gray-400">{getTime(order.created_at)}</div>
					</div>
					
					<div class="space-y-1 md:text-left">
						<div class="text-xs md:text-sm text-gray-400">Amount</div>
						<div class="font-medium text-sm md:text-base">₹{order.amount}</div>
					</div>
					
					<div class="col-span-2 md:col-span-4 flex justify-center text-gray-400 pt-2 md:hidden">
						<Icon icon={visible[i] ? 'ph:caret-up-bold' : 'ph:caret-down-bold'} class="text-lg"/>
					</div>
				</button>

				{#if visible[i]}
					<div class="border-t border-white/10">
						{#await getCartDetails(order.cart_id)}
							<div class="p-4 text-center text-gray-400">
								<Icon icon="ph:spinner" class="animate-spin text-2xl mx-auto mb-2" />
								Loading order details...
							</div>
						{:then list}
							{#if !list.cart || !list.products || list.cart.length <= 0 || list.products.length <= 0}
								<div class="p-4 text-center text-gray-400">
									Unable to fetch order information
								</div>
							{:else}
								<div class="divide-y divide-white/10">
									{#each list.cart as item, j}
										<a
											href={`/${order.cart_id}/craft/item=${item.product_id}`}
											class="block md:grid md:grid-cols-3 gap-4 p-3 md:p-4 hover:bg-white/5 transition-all text-sm"
										>
											<div class="font-medium text-accent mb-1 md:mb-0 flex justify-between items-center">
												<span>{list.products[j].name}</span>
												<span class="md:hidden text-gray-400 text-xs">(₹{item.price})</span>
											</div>
											<div class="flex justify-between items-center text-gray-400 md:text-center mb-1 md:mb-0">
												<span class="md:hidden text-xs">Quantity:</span>
												<span>{item.qty} {item.qty === 1 ? 'unit' : 'units'}</span>
											</div>
											<div class="flex justify-between items-center md:text-right">
												<span class="md:hidden text-xs text-gray-400">Subtotal:</span>
												<span class="font-medium">₹{item.price * item.qty}</span>
											</div>
										</a>
									{/each}
									
									<div class="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 md:p-4 text-gray-400 text-sm">
										<div>Shipping</div>
										<div class="hidden md:block"></div>
										<div class="text-right">₹{list.shipping}</div>
									</div>
									
									<div class="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 md:p-4 font-medium text-sm md:text-base">
										<div>Total</div>
										<div class="hidden md:block"></div>
										<div class="text-right">₹{list.price}</div>
									</div>
								</div>
							{/if}
						{/await}
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<style>
	@reference "../../../../../app.css";
	.lhead {
		@apply border-[1px] border-solid border-orange-300 bg-scoranged2 rounded-xl text-orange-200 opacity-75;
	}

	.litem {
		@apply bg-scoranged2 hover:bg-scorange/10 p-4 text-orange-200 opacity-75 grid grid-flow-col grid-cols-4 gap-x-4 max-sm:text-sm text-center;
	}

	.litem:first-child,
	.litem:last-child {
		@apply rounded-xl;
	}
	.noshow {
		@apply !invisible !max-h-0 !border-0 !m-0 !opacity-0;
	}
	/* Hide scrollbar for Chrome, Safari and Opera */
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}

	/* Hide scrollbar for IE, Edge and Firefox */
	.no-scrollbar {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}
</style>
