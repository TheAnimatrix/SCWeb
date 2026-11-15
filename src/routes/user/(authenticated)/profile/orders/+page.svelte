<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import type { PrintRequestEvent } from '$lib/types/printRequest';
	import { formatPrintEventAmountInr } from '$lib/types/printEventMoney';
	import { navigating, page } from '$app/state';
	import {
		OrderCardSkeleton,
		ProseSkeleton,
		ScButton,
		PlaceholderImage,
		MakerAttribution
	} from '$lib/components/sc';
	import { cubicOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';

	import { formatOrderDisplayId } from '$lib/formatOrderDisplayId';
	import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';
	import { formatDate, formatDateTime, formatInr } from '$lib/utils/format';
	import { productPath } from '$lib/seo/product';
	import {
		isFailedPaymentAttempt,
		ORDER_STATUS_DISPLAY,
		type ProfileOrder,
		type StatusTone
	} from './orderStatus';

	const SUPPORT_EMAIL = 'support@selfcrafted.in';

	let { data } = $props();
	function supabase() {
		return requireBrowserSupabase(data.supabase);
	}

	const allOrders: ProfileOrder[] = $derived(data.orders ?? []);
	const orders = $derived(allOrders.filter((order) => !isFailedPaymentAttempt(order.status)));
	const failedAttempts = $derived(
		allOrders.filter((order) => isFailedPaymentAttempt(order.status))
	);
	const ordersError = $derived(Boolean(data.ordersError));

	let expanded = $state<Record<string, boolean>>({});

	const isPageLoading = $derived(
		page.url.pathname.startsWith('/user/profile/orders') && !!navigating.to
	);

	const TONE_CLASS: Record<StatusTone, string> = {
		success: 'text-green-700 dark:text-green-500',
		progress: 'text-foreground',
		warning: 'text-amber-700 dark:text-amber-500',
		danger: 'text-destructive',
		neutral: 'text-muted-foreground'
	};

	function getTime(timestamp: string) {
		return new Date(timestamp).toLocaleTimeString('en-IN', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function parseAddress(value: unknown): Record<string, string | undefined> {
		if (typeof value !== 'string') return (value as Record<string, string | undefined>) ?? {};
		try {
			return JSON.parse(value || '{}') ?? {};
		} catch {
			return {};
		}
	}

	function helpMailto(order: ProfileOrder): string {
		const displayId = formatOrderDisplayId(order.id);
		const lines = [`Order ID: ${displayId}`];
		if (order.payment_id) lines.push(`Payment ID: ${order.payment_id}`);
		lines.push('', '');
		const params = `subject=${encodeURIComponent(`Help with order ${displayId}`)}&body=${encodeURIComponent(lines.join('\n'))}`;
		return `mailto:${SUPPORT_EMAIL}?${params}`;
	}

	function itemsSubtotal(order: ProfileOrder): number {
		return order.item_snapshot.reduce((acc, item) => acc + item.price * item.qty, 0);
	}

	function sentenceCase(value: string): string {
		const text = value.replaceAll('_', ' ');
		return text.charAt(0).toUpperCase() + text.slice(1);
	}

	function eventAmount(event: PrintRequestEvent): string {
		const amount = formatPrintEventAmountInr(event.extra);
		return amount ? ` (${formatInr(Number(amount))})` : '';
	}
</script>

{#snippet addressBlock(title: string, address: Record<string, string | undefined>)}
	<div class="flex-1">
		<span class="text-xs text-muted-foreground">{title}</span>
		<div class="mt-1 flex flex-col gap-0.5">
			{#if address.name}
				<span class="font-medium">{address.name}</span>
			{/if}
			{#if address.line1}
				<span class="text-muted-foreground">{address.line1}</span>
			{/if}
			{#if address.line2}
				<span class="text-muted-foreground">{address.line2}</span>
			{/if}
			{#if address.city || address.state || address.pincode}
				<span class="text-muted-foreground">
					{[address.city, [address.state, address.pincode].filter(Boolean).join(' - ')]
						.filter(Boolean)
						.join(', ')}
				</span>
			{/if}
			{#if address.phone}
				<span class="text-muted-foreground">{address.phone}</span>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet statusLabel(order: ProfileOrder)}
	{@const display = ORDER_STATUS_DISPLAY[order.status]}
	<span class="inline-flex items-center gap-1.5 text-sm font-medium {TONE_CLASS[display.tone]}">
		<Icon icon={display.icon} class="size-4 shrink-0" aria-hidden="true" />
		<span>{display.label}</span>
	</span>
{/snippet}

<div class="space-y-3">
	{#if isPageLoading}
		<OrderCardSkeleton count={3} />
	{:else}
		{#if ordersError}
			<div
				role="alert"
				class="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
				<Icon icon={F.errorCircle} class="mt-0.5 size-4 shrink-0" />
				<span>
					Couldn't load your orders. Refresh to try again, or write to
					<a href="mailto:{SUPPORT_EMAIL}" class="underline">{SUPPORT_EMAIL}</a> with your payment ID.
				</span>
			</div>
		{/if}

		{#if orders.length === 0 && !ordersError}
			<div class="rounded-md border border-border bg-card px-4 py-8 text-center">
				<Icon icon={F.shoppingBag} class="mx-auto mb-3 size-8 text-muted-foreground" />
				<p class="text-sm text-muted-foreground">No orders yet.</p>
				<ScButton href="/crafts" variant="secondary" class="mt-3">Browse crafts</ScButton>
			</div>
		{:else if orders.length > 0}
			<div class="overflow-hidden rounded-md border border-border">
				<div
					class="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_auto] gap-3 border-b border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground sm:grid">
					<div>Order</div>
					<div>Status</div>
					<div>Date</div>
					<div class="text-right">Amount</div>
				</div>

				<ul class="divide-y divide-border">
					{#each orders as order (order.id)}
						{@const key = String(order.id)}
						{@const isOpen = !!expanded[key]}
						{@const shipping_address = parseAddress(order.shipping_address)}
						{@const billing_address = parseAddress(order.billing_address)}
						<li>
							<button
								type="button"
								class="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 px-3 py-3 text-left transition-colors hover:bg-secondary/50 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_auto]"
								aria-expanded={isOpen}
								onclick={() => {
									expanded = { ...expanded, [key]: !isOpen };
								}}>
								<div class="font-mono text-sm font-medium" title={key}>
									<span class="sr-only">Order </span>{formatOrderDisplayId(order.id)}
								</div>

								<div class="col-start-1 row-start-2 min-w-0 sm:col-start-2 sm:row-start-1">
									{@render statusLabel(order)}
								</div>

								<div class="col-start-1 row-start-3 min-w-0 sm:col-start-3 sm:row-start-1">
									<div class="text-sm">{formatDate(order.created_at)}</div>
									<div class="text-xs text-muted-foreground">{getTime(order.created_at)}</div>
								</div>

								<div
									class="col-start-2 row-start-1 flex items-start justify-end gap-1 text-sm font-medium sm:col-start-4">
									<span>{formatInr(order.amount)}</span>
									<span class="text-muted-foreground" aria-hidden="true">
										<Icon icon={isOpen ? F.chevronUp : F.chevronDown} class="size-4" />
									</span>
								</div>
							</button>

							{#if isOpen}
								<div
									class="border-t border-border bg-secondary/20"
									in:slide={{ duration: 200, easing: cubicOut }}
									out:slide={{ duration: 200, easing: cubicOut }}>
									<div class="flex flex-col gap-4 p-3 text-sm sm:flex-row sm:gap-6">
										{@render addressBlock('Shipping', shipping_address)}
										{@render addressBlock('Billing', billing_address)}
									</div>

									{#if (order.trackingId && order.trackingCourier) || (order.trackingUrl && order.trackingCourier)}
										<div class="flex flex-wrap gap-2 border-t border-border p-3 text-sm">
											<span class="text-xs text-muted-foreground">Tracking</span>
											<span>{order.trackingId}</span>
											{#if order.trackingUrl}
												<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external courier URL -->
												<a href={order.trackingUrl} class="underline">{order.trackingCourier}</a>
											{:else}
												<span class="text-muted-foreground">{order.trackingCourier}</span>
											{/if}
										</div>
									{/if}

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
														<span class="text-xs text-muted-foreground">3D print</span>
														{#if printRequest.data.model}
															<div class="text-sm">
																<span class="text-muted-foreground">Model: </span>
																{#if !(printRequest.data.model.startsWith('https://') || printRequest.data.model.startsWith('http://'))}
																	{@const modelName = printRequest.data.model
																		?.split('/')
																		.pop()
																		.split('.')}
																	{@const modelName2 = modelName[modelName.length - 2].split('_')}
																	<a
																		href={resolve(`/3dp-portal/user/${printRequest.data.id}`)}
																		class="underline"
																		>{modelName
																			? `${modelName2[modelName2.length - 1]}.${modelName[modelName.length - 1]}`
																			: 'Model'}</a>
																{:else}
																	<span class="text-muted-foreground"
																		>{printRequest.data.model}</span>
																{/if}
															</div>
														{/if}
														{#if printRequest.data.model_data}
															<div class="text-sm">
																<span class="text-muted-foreground">Specs: </span>
																<div class="mt-1 flex flex-wrap gap-1.5 text-xs">
																	{#if printRequest.data.model_data.color}
																		<span
																			class="flex items-center gap-1 rounded border border-border px-1.5 py-0.5"
																			>Colour <span
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
																	{#each Object.entries(printRequest.data.model_data) as [specKey, value] (specKey)}
																		{#if !['color', 'quality', 'scale', 'infill', 'walls'].includes(specKey) && value}
																			<span class="rounded border border-border px-1.5 py-0.5"
																				>{sentenceCase(specKey)}: {value}</span>
																		{/if}
																	{/each}
																</div>
															</div>
														{/if}
														{#if printRequest.data.events && printRequest.data.events.length > 0}
															<div class="text-sm">
																<span class="text-xs text-muted-foreground">Updates</span>
																<div class="mt-1 space-y-1">
																	{#each printRequest.data.events
																		.filter((e: PrintRequestEvent) => e.type !== 'order_created')
																		.sort((a: PrintRequestEvent, b: PrintRequestEvent) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
																		.slice(0, 3) as event (event.timestamp + event.type)}
																		<div
																			class="rounded-md border border-border px-2 py-1.5 text-xs">
																			<div
																				class="flex flex-wrap items-center justify-between gap-2">
																				<span>{sentenceCase(event.type)}{eventAmount(event)}</span>
																				<span class="text-muted-foreground"
																					>{formatDateTime(event.timestamp)}</span>
																			</div>
																			{#if event.reason}
																				<div class="mt-0.5 text-muted-foreground">
																					{event.reason}
																				</div>
																			{/if}
																		</div>
																	{/each}
																</div>
															</div>
														{/if}
													</div>
												{:else}
													<p class="text-center text-muted-foreground">
														Couldn't load the details of this 3D print.
													</p>
												{/if}
											{:catch}
												<p class="text-center text-muted-foreground">
													Couldn't load the details of this 3D print.
												</p>
											{/await}
										</div>
									{:else if !order.item_snapshot || order.item_snapshot.length <= 0}
										<div class="border-t border-border p-3 text-sm">
											<p class="text-center text-muted-foreground">
												Line items for this older order were not saved.
											</p>
											<div class="mt-2 flex justify-between font-medium">
												<span>Order total</span>
												<span>{formatInr(order.amount)}</span>
											</div>
										</div>
									{:else}
										<div class="divide-y divide-border border-t border-border">
											{#each order.item_snapshot as item (item.product_id + item.qty)}
												<!-- eslint-disable svelte/no-navigation-without-resolve -- productPath builds the canonical product URL -->
												<a
													href={productPath({ id: item.product_id, name: item.product_name })}
													class="flex gap-3 p-3 text-sm transition-colors hover:bg-secondary/50">
													<div
														class="relative size-14 shrink-0 overflow-hidden rounded-md border border-border">
														<PlaceholderImage
															src={item.image_url ?? undefined}
															alt={item.product_name}
															class="size-full object-cover" />
													</div>
													<div
														class="grid min-w-0 flex-1 gap-2 md:grid-cols-3 md:items-center md:gap-4">
														<div class="min-w-0">
															<div class="font-medium">{item.product_name}</div>
															{#if item.author}
																<MakerAttribution
																	username={item.author}
																	tier={item.authorTier}
																	class="mt-0.5" />
															{/if}
															<span class="text-xs text-muted-foreground md:hidden"
																>{formatInr(item.price)} each</span>
														</div>
														<div
															class="flex justify-between text-muted-foreground md:justify-center">
															<span class="text-xs md:hidden">Qty</span>
															<span>{item.qty}</span>
														</div>
														<div class="flex justify-between md:justify-end">
															<span class="text-xs text-muted-foreground md:hidden">Subtotal</span>
															<span class="font-medium">{formatInr(item.price * item.qty)}</span>
														</div>
													</div>
												</a>
												<!-- eslint-enable svelte/no-navigation-without-resolve -->
											{/each}

											<div class="grid grid-cols-2 gap-2 p-3 text-sm text-muted-foreground">
												<div>Delivery</div>
												<div class="text-right">
													{formatInr(order.delivery_fee ?? order.amount - itemsSubtotal(order))}
												</div>
											</div>

											<div class="grid grid-cols-2 gap-2 p-3 text-sm font-medium">
												<div>Total</div>
												<div class="text-right">{formatInr(order.amount)}</div>
											</div>
										</div>
									{/if}

									<div class="border-t border-border p-3 text-sm">
										<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- mailto link -->
										<a href={helpMailto(order)} class="inline-flex items-center gap-1.5 underline">
											<Icon icon={F.mail} class="size-4" aria-hidden="true" />
											Get help with this order
										</a>
									</div>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if failedAttempts.length > 0}
			<details class="rounded-md border border-border bg-card">
				<summary class="cursor-pointer px-3 py-3 text-sm">
					Payments that didn't go through ({failedAttempts.length})
				</summary>
				<div class="border-t border-border px-3 py-3 text-sm">
					<p class="text-muted-foreground">
						No order was placed for these. If money left your account, write to
						<a href="mailto:{SUPPORT_EMAIL}" class="underline">{SUPPORT_EMAIL}</a> with the payment ID.
					</p>
					<ul class="mt-3 divide-y divide-border">
						{#each failedAttempts as attempt (attempt.id)}
							<li class="flex flex-wrap items-center justify-between gap-2 py-2">
								<div class="min-w-0">
									{@render statusLabel(attempt)}
									<div class="text-xs text-muted-foreground">
										{formatDateTime(attempt.created_at)}
										{#if attempt.payment_id}
											· Payment ID <span class="font-mono">{attempt.payment_id}</span>
										{/if}
									</div>
								</div>
								<span class="font-medium">{formatInr(attempt.amount)}</span>
							</li>
						{/each}
					</ul>
				</div>
			</details>
		{/if}
	{/if}
</div>
