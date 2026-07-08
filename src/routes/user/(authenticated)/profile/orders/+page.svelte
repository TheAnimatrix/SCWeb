<script lang="ts">
	import type { Orders } from '$lib/types/product.js';
	import type { PrintRequestEvent } from '$lib/types/printRequest';
	import { navigating, page } from '$app/state';
	import { OrderCardSkeleton, ProseSkeleton, ScButton } from '$lib/components/sc';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import CheckCircle from '@lucide/svelte/icons/circle-check';
	import Clock from '@lucide/svelte/icons/clock';
	import { cubicOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';

	import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';

	let { data } = $props();
	function supabase() {
		return requireBrowserSupabase(data.supabase);
	}

	let orders: Orders = $state([]);
	orders = data.orders;
	let visible = $state(Array(orders.length).fill(false));

	const isPageLoading = $derived(
		page.url.pathname.startsWith('/user/profile/orders') && !!navigating.to
	);

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
				return 'text-green-600';
			case 'pending':
				return 'text-amber-600';
			case 'failed':
				return 'text-destructive';
			default:
				return 'text-muted-foreground';
		}
	}
</script>

<div class="space-y-3">
	{#if isPageLoading}
		<OrderCardSkeleton count={3} />
	{:else if orders == undefined || orders.length <= 0}
		<div class="rounded-md border border-border bg-card px-4 py-8 text-center">
			<ShoppingBag class="mx-auto mb-3 size-8 text-muted-foreground" />
			<p class="text-sm text-muted-foreground">No orders yet.</p>
			<ScButton href="/crafts" variant="secondary" class="mt-3">Browse crafts</ScButton>
		</div>
	{:else}
		<div class="overflow-hidden rounded-md border border-border">
			<div
				class="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] gap-3 border-b border-border bg-secondary/30 px-3 py-2 font-mono text-xs text-muted-foreground">
				<div>id</div>
				<div>status</div>
				<div>date</div>
				<div class="text-right">amount</div>
			</div>

			<ul class="divide-y divide-border">
				{#each orders as order, i (order.id)}
					{@const shipping_address =
						typeof order.shipping_address === 'string'
							? JSON.parse(order.shipping_address ?? '{}')
							: (order.shipping_address ?? {})}
					{@const billing_address =
						typeof order.billing_address === 'string'
							? JSON.parse(order.billing_address ?? '{}')
							: (order.billing_address ?? {})}
					<li>
						<button
							type="button"
							class="grid w-full grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-secondary/50"
							aria-expanded={visible[i]}
							onclick={() => {
								visible = visible.with(i, !visible[i]);
							}}>
							<div class="break-all text-sm font-medium">{order.id}</div>

							<div
								class="flex items-center gap-1.5 text-sm font-medium capitalize {getStatusColor(
									order.payment_status
								)}">
								{#if order.payment_status.toLowerCase() === 'completed'}
									<CheckCircle class="size-3.5 shrink-0" />
								{:else}
									<Clock class="size-3.5 shrink-0" />
								{/if}
								<span class="truncate">{order.payment_status}</span>
							</div>

							<div class="min-w-0">
								<div class="text-sm font-medium">{getDate(order.created_at)}</div>
								<div class="text-xs text-muted-foreground">{getTime(order.created_at)}</div>
							</div>

							<div class="flex items-start justify-end gap-1 text-sm font-medium">
								<span>₹{order.amount}</span>
								<span class="text-muted-foreground">
									{#if visible[i]}
										<ChevronUp class="size-4" />
									{:else}
										<ChevronDown class="size-4" />
									{/if}
								</span>
							</div>
						</button>

						{#if visible[i]}
							<div
								class="border-t border-border bg-secondary/20"
								in:slide={{ duration: 200, easing: cubicOut }}
								out:slide={{ duration: 200, easing: cubicOut }}>
								<div class="flex gap-6 p-3 text-sm sm:flex-row">
									<div class="flex-1">
										<span class="font-mono text-xs text-muted-foreground">shipping</span>
										<div class="mt-1 space-y-0.5">
											{#if shipping_address?.name}
												<span class="font-medium">{shipping_address.name}</span>
											{/if}
											{#if shipping_address?.line1}
												<span class="text-muted-foreground">{shipping_address.line1}</span>
											{/if}
											{#if shipping_address?.line2}
												<span class="text-muted-foreground">{shipping_address.line2}</span>
											{/if}
											{#if shipping_address?.city || shipping_address?.state || shipping_address?.pincode}
												<span class="text-muted-foreground">
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
												<span class="text-muted-foreground">{shipping_address.phone}</span>
											{/if}
										</div>
									</div>
									<div class="flex-1">
										<span class="font-mono text-xs text-muted-foreground">billing</span>
										<div class="mt-1 space-y-0.5">
											{#if billing_address?.name}
												<span class="font-medium">{billing_address.name}</span>
											{/if}
											{#if billing_address?.line1}
												<span class="text-muted-foreground">{billing_address.line1}</span>
											{/if}
											{#if billing_address?.line2}
												<span class="text-muted-foreground">{billing_address.line2}</span>
											{/if}
											{#if shipping_address?.city || shipping_address?.state || shipping_address?.pincode}
												<span class="text-muted-foreground">
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
												<span class="text-muted-foreground">{billing_address.phone}</span>
											{/if}
										</div>
									</div>
								</div>
								<!--Tracking if exists-->
								{#if (order.trackingId && order.trackingCourier) || (order.trackingUrl && order.trackingCourier)}
									<div class="flex flex-wrap gap-2 border-t border-border p-3 text-sm">
										<span class="font-mono text-xs text-muted-foreground">tracking</span>
										<span>{order.trackingId}</span>
										{#if order.trackingUrl}
											<a href={order.trackingUrl} class="underline">{order.trackingCourier}</a>
										{:else}
											<span class="text-muted-foreground">{order.trackingCourier}</span>
										{/if}
									</div>
								{/if}
								<!--Items-->
								{#if order.payment_method.includes('PrintRequest')}
									<div class="border-t border-border p-3 text-sm">
										{#await supabase()
											.from('printrequests')
											.select('*')
											.eq('id', order.cart_id)
											.single()}
											<div class="py-4">
												<ProseSkeleton lines={4} />
											</div>
										{:then printRequest}
											{#if printRequest.data}
												<div class="space-y-2">
													<div class="flex items-center justify-between">
														<span class="font-mono text-xs text-muted-foreground">3d print</span>
														<span
															class="rounded-md border border-border px-2 py-0.5 font-mono text-xs capitalize"
															>{printRequest.data.request_stage}</span>
													</div>
													{#if printRequest.data.model}
														<div class="text-sm">
															<span class="text-muted-foreground">model: </span>
															{#if !(printRequest.data.model.startsWith('https://') || printRequest.data.model.startsWith('http://'))}
																{@const modelName = printRequest.data.model
																	?.split('/')
																	.pop()
																	.split('.')}
																{@const modelName2 = modelName[modelName.length - 2].split('_')}
																<a href="/3dp-portal/user/{printRequest.data.id}" class="underline"
																	>{modelName
																		? `${modelName2[modelName2.length - 1]}.${modelName[modelName.length - 1]}`
																		: 'Model'}</a>
															{:else}
																<span class="text-muted-foreground">{printRequest.data.model}</span>
															{/if}
														</div>
													{/if}
													<!-- show model_data if exists -->
													{#if printRequest.data.model_data}
														<div class="text-sm">
															<span class="text-muted-foreground">specs: </span>
															<div class="mt-1 flex flex-wrap gap-1.5 text-xs">
																{#if printRequest.data.model_data.color}
																	<span
																		class="flex items-center gap-1 rounded border border-border px-1.5 py-0.5"
																		>color <span
																			class="inline-block size-2.5 rounded-sm"
																			style={`background-color:${printRequest.data.model_data.color}`}
																		></span
																		></span>
																{/if}
																{#if printRequest.data.model_data.quality}
																	<span class="rounded border border-border px-1.5 py-0.5"
																		>{printRequest.data.model_data.quality}</span>
																{/if}
																{#if printRequest.data.model_data.scale}
																	<span class="rounded border border-border px-1.5 py-0.5"
																		>{printRequest.data.model_data.scale}x</span>
																{/if}
																{#if printRequest.data.model_data.infill}
																	<span class="rounded border border-border px-1.5 py-0.5"
																		>{printRequest.data.model_data.infill}%</span>
																{/if}
																{#if printRequest.data.model_data.walls}
																	<span class="rounded border border-border px-1.5 py-0.5"
																		>{printRequest.data.model_data.walls} walls</span>
																{/if}
																{#if printRequest.data.material}
																	<span class="rounded border border-border px-1.5 py-0.5"
																		>{printRequest.data.material}</span>
																{/if}
																{#each Object.entries(printRequest.data.model_data) as [key, value] (key)}
																	{#if !['color', 'quality', 'scale', 'infill', 'walls'].includes(key) && value}
																		<span class="rounded border border-border px-1.5 py-0.5"
																			>{key}: {value}</span>
																	{/if}
																{/each}
															</div>
														</div>
													{/if}
													{#if printRequest.data.events && printRequest.data.events.length > 0}
														<div class="text-sm">
															<span class="font-mono text-xs text-muted-foreground">events</span>
															<div class="mt-1 space-y-1">
																{#each printRequest.data.events
																	.filter((e: PrintRequestEvent) => e.type !== 'order_created')
																	.sort((a: PrintRequestEvent, b: PrintRequestEvent) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
																	.slice(0, 3) as event (event.timestamp + event.type)}
																	<div class="rounded-md border border-border px-2 py-1.5 text-xs">
																		<div class="flex items-center justify-between gap-2">
																			<span class="capitalize"
																				>{event.type}{event.extra?.amount
																					? ` (₹${(parseInt(event.extra?.amount) / 100).toFixed(2)})`
																					: ''}{event.extra?.quote
																					? ` (₹${event.extra?.quote})`
																					: ''}</span>
																			<span class="text-muted-foreground"
																				>{new Date(event.timestamp).toLocaleString()}</span>
																		</div>
																		{#if event.reason}
																			<div class="mt-0.5 text-muted-foreground">{event.reason}</div>
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
								{:else if !order.item_snapshot || order.item_snapshot.length <= 0}
									<div class="border-t border-border p-3 text-center text-sm text-muted-foreground">
										Unable to fetch order information
									</div>
								{:else}
									<div class="divide-y divide-border border-t border-border">
										{#each order.item_snapshot as item (item.product_id + item.qty)}
											<a
												href={`/${order.cart_id}/craft/item=${item.product_id}`}
												class="grid gap-2 p-3 text-sm transition-colors hover:bg-secondary/50 md:grid-cols-3 md:gap-4">
												<div class="flex items-center justify-between font-medium md:justify-start">
													<span>{item.product_name}</span>
													<span class="text-xs text-muted-foreground md:hidden">₹{item.price}</span>
												</div>
												<div class="flex justify-between text-muted-foreground md:justify-center">
													<span class="text-xs md:hidden">qty</span>
													<span>{item.qty}</span>
												</div>
												<div class="flex justify-between md:justify-end">
													<span class="text-xs text-muted-foreground md:hidden">subtotal</span>
													<span class="font-medium">₹{item.price * item.qty}</span>
												</div>
											</a>
										{/each}

										<div
											class="grid grid-cols-2 gap-2 p-3 text-sm text-muted-foreground md:grid-cols-3">
											<div>shipping</div>
											<div class="hidden md:block"></div>
											<div class="text-right">
												₹{order.amount -
													order.item_snapshot.reduce((acc, item) => acc + item.price * item.qty, 0)}
											</div>
										</div>

										<div class="grid grid-cols-2 gap-2 p-3 text-sm font-medium md:grid-cols-3">
											<div>total</div>
											<div class="hidden md:block"></div>
											<div class="text-right">₹{order.amount}</div>
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
