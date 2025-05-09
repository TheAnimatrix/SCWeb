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
			case 1:
				return 'st';
			case 2:
				return 'nd';
			case 3:
				return 'rd';
			default:
				return 'th';
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
</script>

<div class="space-y-6">
	{#if orders == undefined || orders.length <= 0 || subload}
		<div class="bg-[#151515] rounded-xl p-8 text-center">
			<Icon icon="ph:shopping-bag-bold" class="text-4xl text-gray-400 mx-auto mb-4" />
			{#if subload}
				<p class="text-gray-400">Loading your orders...</p>
			{:else}
				<p class="text-gray-400">No orders placed yet</p>
				<a
					href="/shop"
					class="inline-block mt-4 px-6 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-all">
					Start Shopping
				</a>
			{/if}
		</div>
	{:else}
		{#each orders as order, i}
			{@const shipping_address = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address ?? '{}') : (order.shipping_address ?? {})}
			{@const billing_address = typeof order.billing_address === 'string' ? JSON.parse(order.billing_address ?? '{}') : (order.billing_address ?? {})}
			<div class="bg-[#151515] rounded-xl overflow-hidden">
				<button
					class="w-full p-3 md:p-4 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 items-start text-left hover:bg-white/5 transition-all"
					onclick={() => {
						visible = visible.with(i, !visible[i]);
					}}>
					<div class="space-y-1 md:col-span-1">
						<div class="text-xs md:text-sm text-gray-400">Order ID</div>
						<div class="font-medium text-sm md:text-base break-all">{order.id}</div>
					</div>

					<div class="space-y-1">
						<div class="text-xs md:text-sm text-gray-400">Status</div>
						<div
							class="font-medium text-sm md:text-base capitalize {getStatusColor(
								order.payment_status
							)}">
							<span class="flex items-center gap-1.5 md:gap-2">
								<Icon
									icon={order.payment_status.toLowerCase() === 'completed'
										? 'ph:check-circle'
										: 'ph:clock'} />
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
						<Icon icon={visible[i] ? 'ph:caret-up-bold' : 'ph:caret-down-bold'} class="text-lg" />
					</div>
				</button>

				{#if visible[i]}
					<div class="border-t border-white/10">
						<!--Addresses-->
						<div class="p-4 text-left text-gray-400 flex xs:flex-col sm:flex-row gap-x-8 bg-accent/5 w-full">
							<div class="flex flex-col flex-1">
								<span class="font-medium text-accent">Shipping Address:</span>
								<div class="flex flex-col space-y-1 text-sm">
									{#if shipping_address?.name}
										<span class="font-medium">{shipping_address.name}</span>
									{/if}
									{#if shipping_address?.line1}
										<span class="text-gray-300">{shipping_address.line1}</span>
									{/if}
									{#if shipping_address?.line2}
										<span class="text-gray-300">{shipping_address.line2}</span>
									{/if}
									{#if shipping_address?.city || shipping_address?.state || shipping_address?.pincode}
										<span class="text-gray-300">
											{shipping_address.city}
											{#if shipping_address.city && (shipping_address.state || shipping_address.pincode)},
											{/if}
											{shipping_address.state}
											{#if shipping_address.state && shipping_address.pincode}
												-
											{/if}
											{shipping_address.pincode}
										</span>
									{/if}
									{#if shipping_address?.phone}
										<span class="text-gray-300">Phone: {shipping_address.phone}</span>
									{/if}
								</div>
							</div>
							<div class="flex flex-col flex-1">
								<span class="font-medium text-accent">Billing Address:</span>
								<div class="flex flex-col space-y-1 text-sm">
									{#if billing_address?.name}
										<span class="font-medium">{billing_address.name}</span>
									{/if}
									{#if billing_address?.line1}
										<span class="text-gray-300">{billing_address.line1}</span>
									{/if}
									{#if billing_address?.line2}
										<span class="text-gray-300">{billing_address.line2}</span>
									{/if}
									{#if shipping_address?.city || shipping_address?.state || shipping_address?.pincode}
										<span class="text-gray-300">
											{billing_address.city}
											{#if billing_address.city && (billing_address.state || billing_address.pincode)},
											{/if}
											{billing_address.state}
											{#if billing_address.state && billing_address.pincode}
												-
											{/if}
											{billing_address.pincode}
										</span>
									{/if}
									{#if billing_address?.phone}
										<span class="text-gray-300">Phone: {billing_address.phone}</span>
									{/if}
								</div>
							</div>
						</div>
						<!--Tracking if exists-->
						{#if (order.trackingId && order.trackingCourier) || (order.trackingUrl && order.trackingCourier)}
							<div class="p-4 text-left text-gray-400 flex gap-2 flex-wrap bg-accent/2">
								<span class="font-medium text-accent">Tracking Details:</span>
								<div>
									<span class="text-gray-300">{order.trackingId}</span>
									{#if order.trackingUrl}
										<a href={order.trackingUrl} class="text-sky-400 underline">{order.trackingCourier}</a>
									{:else}
										<span class="text-gray-300">{order.trackingCourier}</span>
									{/if}
								</div>
							</div>
						{/if}
						<!--Items-->
						{#if order.payment_method.includes('PrintRequest')}
							<div class="p-4 text-gray-400">
								{#await data.supabase_lt.from('printrequests').select('*').eq('id', order.cart_id).single()}
									<div class="flex justify-center items-center py-8">
										<div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
										<span class="ml-3 text-accent">Loading request details...</span>
									</div>
								{:then printRequest}
									{#if printRequest.data}
										<div class="flex flex-col gap-2">
											<div class="flex justify-between items-center">
												<span class="font-medium text-accent">3D Print Request Details:</span>
												<span class="text-sm px-2 py-1 rounded-md {printRequest.data.request_stage === 'paid' ? 'bg-green-500/10 text-green-400 border border-green-400/20' : printRequest.data.request_stage === 'completed' ? 'bg-gray-500/10 text-gray-300 border border-gray-400/20' : 'bg-accent/10 text-accent border border-accent/20'}">
													{printRequest.data.request_stage}
												</span>
											</div>
											{#if printRequest.data.model}
												<div class="text-sm">
													<span class="font-medium text-accent">Model:</span>
													{#if !(printRequest.data.model.startsWith('https://') || printRequest.data.model.startsWith('http://'))}
														{@const modelName = printRequest.data.model?.split('/').pop().split('.')}
														{@const modelName2 = modelName[modelName.length - 2].split('_')}
														<a href="/3dp-portal/user/{printRequest.data.id}" class="underline text-sky-300">{modelName ? `${modelName2[modelName2.length - 1]}.${modelName[modelName.length - 1]}` : 'Model'}</a>
													{:else}
														<span class="text-gray-300">{printRequest.data.model}</span>
													{/if}
												</div>
											{/if}
											<!-- show model_data if exists -->
											{#if printRequest.data.model_data}
												<div class="text-sm">
													<span class="font-medium text-accent">Model Data:</span>
													<div class="flex flex-wrap gap-2 text-xs text-white/80 mt-1">
														{#if printRequest.data.model_data.color}
															<span class="bg-accent/10 px-2 py-0.5 rounded flex items-center gap-1.5">Color: <div class="w-3 h-3 rounded-sm" style={`background-color:${printRequest.data.model_data.color}`}></div></span>
														{/if}
														{#if printRequest.data.model_data.quality}
															<span class="bg-accent/10 px-2 py-0.5 rounded">Quality: {printRequest.data.model_data.quality}</span>
														{/if}
														{#if printRequest.data.model_data.scale}
															<span class="bg-accent/10 px-2 py-0.5 rounded">Scale: {printRequest.data.model_data.scale}x</span>
														{/if}
														{#if printRequest.data.model_data.infill}
															<span class="bg-accent/10 px-2 py-0.5 rounded">Infill: {printRequest.data.model_data.infill}%</span>
														{/if}
														{#if printRequest.data.model_data.walls}
															<span class="bg-accent/10 px-2 py-0.5 rounded">Walls: {printRequest.data.model_data.walls}</span>
														{/if}
														{#if printRequest.data.material}
															<span class="bg-accent/10 px-2 py-0.5 rounded">Material: {printRequest.data.material}</span>
														{/if}
														{#each Object.entries(printRequest.data.model_data) as [key, value]}
															{#if !['color', 'quality', 'scale', 'infill', 'walls'].includes(key) && value}
																<span class="bg-accent/10 px-2 py-0.5 rounded">{key}: {value}</span>
															{/if}
														{/each}
													</div>
												</div>
											{/if}
											{#if printRequest.data.events && printRequest.data.events.length > 0}
												<div class="text-sm mt-2">
													<span class="font-medium text-accent">Event history:</span>
													<div class="mt-1 space-y-1">
														{#each printRequest.data.events.filter((e: any) => e.type !== 'order_created').sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 3) as event}
															<div class="bg-black/10 px-3 py-2 rounded-lg border border-accent/10 text-xs">
																<div class="flex items-center justify-between">
																	<span class="font-medium"><span class="capitalize">{event.type} {event.extra?.amount ? `(₹${(parseInt(event.extra?.amount)/100).toFixed(2)})` : ''} {event.extra?.quote ? `(₹${event.extra?.quote})` : ''}</span></span>
																	<span class="text-gray-400 text-xs">{new Date(event.timestamp).toLocaleString()}</span>
																</div>
																{#if event.reason}
																	<div class="text-gray-400 mt-1">{event.reason}</div>
																{/if}
															</div>
														{/each}
													</div>
												</div>
											{/if}
										</div>
									{:else}
										<div class="text-center">Unable to fetch 3D print request details</div>
									{/if}
								{:catch}
									<div class="text-center">Error loading 3D print request details</div>
								{/await}
							</div>
						{:else}
						{#if !order.item_snapshot || order.item_snapshot.length <= 0}
							<div class="p-4 text-center text-gray-400">Unable to fetch order information</div>
						{:else}
							<div class="divide-y divide-white/10">
								{#each order.item_snapshot as item, j}
									<a
										href={`/${order.cart_id}/craft/item=${item.product_id}`}
										class="block md:grid md:grid-cols-3 gap-4 p-3 md:p-4 hover:bg-white/5 transition-all text-sm">
										<div
											class="font-medium text-accent mb-1 md:mb-0 flex justify-between items-center">
											<span>{item.product_name}</span>
											<span class="md:hidden text-gray-400 text-xs">(₹{item.price})</span>
										</div>
										<div
											class="flex justify-between items-center text-gray-400 md:text-center mb-1 md:mb-0">
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
									<div class="text-right">
										₹{order.amount -
											order.item_snapshot.reduce((acc, item) => acc + item.price * item.qty, 0)}
									</div>
								</div>

								<div
									class="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 md:p-4 font-medium text-sm md:text-base">
									<div>Total</div>
									<div class="hidden md:block"></div>
									<div class="text-right">₹{order.amount}</div>
								</div>
							</div>
						{/if}
						{/if}
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
