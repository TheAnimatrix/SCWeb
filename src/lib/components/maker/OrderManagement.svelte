<script lang="ts">
	import { F } from '$lib/icons/fluent';

	import type { TypedSupabaseClient } from '$lib/types/database';
	import type { Json } from '../../../../supabase/types';
	import {
		getPrintRequestDisplayName,
		makerHasNextStep,
		printStageLabel,
		type PrintRequestEvent
	} from '$lib/types/printRequest';
	import Icon from '@iconify/svelte';
	import { toastStore } from '$lib/client/toastStore';
	import { getModelDownloadUrl, triggerSignedUrlDownload } from '$lib/client/printFilesApi';
	import { PortalCard, PortalSectionLabel } from '$lib/components/portal';
	import { TableBodySkeleton } from '$lib/components/sc';
	import { formatDate, formatInr } from '$lib/utils/format';
	import { cn } from '$lib/utils';
	import { resolve } from '$app/paths';

	let {
		supabase,
		session
	}: { supabase: TypedSupabaseClient; session: { data: { user: { id: string } } } | null } =
		$props();

	interface PrintRequest {
		id: string;
		created_at: string;
		model: string | null;
		request_stage: string | null;
		quote: number | null;
		user_id: string | null;
		username?: string | null;
		model_metadata: Json | null;
		model_data: {
			color: string;
			scale: string;
			material: string;
			quality: string;
			infill: string;
			walls?: string;
		};
		events?: PrintRequestEvent[];
		update_count?: number;
	}

	let orders = $state<PrintRequest[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let page = $state(1);
	let pageSize = 50;
	let downloading = $state(-1);
	let downloadProgress = $state(0);
	// The orders endpoint returns no total, so a full page means there may be more.
	const hasOlder = $derived(orders.length === pageSize);

	// Requests where the maker has the next step come first; otherwise newest first.
	const sortedOrders = $derived(
		[...orders].sort((a, b) => {
			const turnA = makerHasNextStep(a.request_stage) ? 0 : 1;
			const turnB = makerHasNextStep(b.request_stage) ? 0 : 1;
			if (turnA !== turnB) return turnA - turnB;
			return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
		})
	);

	let orderUnreadCounts = $state<Record<string, number>>({});

	async function downloadModel(order: PrintRequest, index: number) {
		if (!order.model || !order.id) return;
		const modelName = getPrintRequestDisplayName(order.model, order.model_metadata);
		const { data: userRes, error: userErr } = await supabase.auth.getSession();
		if (userErr || !userRes?.session?.access_token) {
			toastStore.show('Sign in to download this model.', 'error');
			return;
		}
		downloading = index;
		downloadProgress = 0;
		try {
			const result = await getModelDownloadUrl(fetch, order.id);
			if (!result.ok) {
				toastStore.show(result.error.message, 'error');
				downloading = -1;
				downloadProgress = 0;
				return;
			}
			triggerSignedUrlDownload(result.data.url, modelName, {
				onProgress: (percent) => {
					downloadProgress = percent;
				},
				onComplete: () => {
					downloading = -1;
					downloadProgress = 0;
				},
				onError: (message) => toastStore.show(message, 'error')
			});
		} catch {
			toastStore.show("Couldn't download the model. Try again.", 'error');
			downloading = -1;
			downloadProgress = 0;
		}
	}

	async function fetchOrders(newPage = 1) {
		if (!session?.data?.user?.id) {
			orders = [];
			isLoading = false;
			error = 'Sign in to see your print requests.';
			return;
		}
		isLoading = true;
		error = null;
		page = newPage;
		try {
			const res = await fetch(`/user/maker/orders?page=${page}&pageSize=${pageSize}`);
			if (!res.ok) {
				error = "Couldn't load print requests. Refresh to try again.";
				orders = [];
				return;
			}
			const result = await res.json();
			orders = result.orders || [];
			page = result.page || 1;
		} catch {
			error = "Couldn't load print requests. Refresh to try again.";
			orders = [];
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		fetchOrders();
	});

	const STAGE_STYLES: Record<string, string> = {
		cancelled: 'border-destructive/30 bg-destructive/5 text-destructive',
		requested: 'border-border bg-muted/40 text-foreground',
		quoted: 'border-border bg-muted/40 text-foreground',
		actionable: 'border-foreground/20 bg-foreground/5 text-foreground',
		paid: 'border-border bg-muted text-foreground',
		paid_externally: 'border-border bg-muted text-foreground',
		completed: 'border-border bg-muted/30 text-muted-foreground',
		'in dispute': 'border-warning/30 bg-warning/5 text-warning',
		default: 'border-border bg-muted/40 text-muted-foreground'
	};

	//it either has to be a url or a file path
	function isUrl(str: string | null): boolean {
		if (!str) return false;
		try {
			new URL(str);
			return true;
		} catch {
			return false;
		}
	}

	async function fetchOrderUnreadCounts() {
		if (!session?.data?.user?.id) {
			orderUnreadCounts = {};
			return;
		}
		// Get all order IDs
		const orderIds = orders.map((o) => o.id);
		if (orderIds.length === 0) {
			orderUnreadCounts = {};
			return;
		}
		// Query all unread messages for these orders
		const { data } = await supabase
			.from('Chat')
			.select('relationship_id')
			.in('relationship_id', orderIds)
			.eq('recipient_id', session.data.user.id)
			.eq('status', 'sent');
		// Count per order
		const counts: Record<string, number> = {};
		if (Array.isArray(data)) {
			for (const row of data) {
				const relId = row.relationship_id;
				if (!relId) continue;
				counts[relId] = (counts[relId] || 0) + 1;
			}
		}
		orderUnreadCounts = counts;
	}

	$effect(() => {
		fetchOrderUnreadCounts();
	});

	$effect(() => {
		const userId = session?.data?.user?.id;
		if (!userId) return;

		const channel = supabase
			.channel(`order-management-chat:${userId}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'Chat',
					filter: `recipient_id=eq.${userId}`
				},
				(payload) => {
					if (payload.new.message_type === 'action') {
						fetchOrders(page);
					}
					if (payload.new?.sender_id !== userId) {
						toastStore.show('New message from a customer.', 'info');
						fetchOrderUnreadCounts();
					}
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	});
</script>

<div id="orderManagement">
	<PortalCard>
		<PortalSectionLabel label="Print requests" class="mb-4" />

		{#if isLoading}
			<div class="overflow-x-auto rounded-md border border-border">
				<table class="min-w-full divide-y divide-border text-left">
					<thead class="bg-muted/30">
						<tr>
							<th class="px-4 py-3 text-sm font-medium text-muted-foreground">Model</th>
							<th class="px-4 py-3 text-sm font-medium text-muted-foreground">Date</th>
							<th class="px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
							<th class="px-4 py-3 text-sm font-medium text-muted-foreground">Quote</th>
							<th class="px-4 py-3 text-sm font-medium text-muted-foreground">Customer</th>
						</tr>
					</thead>
					<TableBodySkeleton rows={5} columns={5} />
				</table>
			</div>
		{:else if error}
			<div class="py-10 text-center text-sm text-destructive" role="alert">{error}</div>
		{:else if orders.length === 0 && page === 1}
			<div class="py-10 text-center text-sm text-muted-foreground">
				No print requests yet. Customers can find you once you have at least one filament with
				stock.
			</div>
		{:else}
			<div class="overflow-x-auto rounded-md border border-border">
				<table class="min-w-full divide-y divide-border text-left">
					<thead class="bg-muted/30">
						<tr>
							<th class="px-4 py-3 text-sm font-medium text-muted-foreground">Model</th>
							<th class="px-4 py-3 text-sm font-medium text-muted-foreground">Date</th>
							<th class="px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
							<th class="px-4 py-3 text-sm font-medium text-muted-foreground">Quote</th>
							<th class="px-4 py-3 text-sm font-medium text-muted-foreground">Customer</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each sortedOrders as order, index (order.id)}
							{@const modelName = getPrintRequestDisplayName(order.model, order.model_metadata)}
							<tr class="transition-colors hover:bg-muted/20">
								<td class="px-4 py-3 text-sm text-foreground">
									<div class="flex items-center gap-2">
										<a
											href={resolve('/3dp-portal/(authenticated)/maker/[id]', { id: order.id })}
											class="max-w-[16rem] truncate font-medium text-foreground underline-offset-2 hover:underline">
											{modelName}
										</a>
										{#if orderUnreadCounts[order.id] > 0}
											<span
												class="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive px-1.5 py-0.5 text-xs text-destructive-foreground"
												aria-label="{orderUnreadCounts[order.id]} unread messages">
												<Icon icon={F.chat} class="size-3" aria-hidden="true" />
												{orderUnreadCounts[order.id]}
											</span>
										{/if}
										{#if order.model && order.request_stage !== 'cancelled'}
											<div class="relative ml-auto w-fit shrink-0">
												{#if isUrl(order.model)}
													<!-- eslint-disable svelte/no-navigation-without-resolve -- external file URL -->
													<a
														href={order.model}
														target="_blank"
														rel="noopener noreferrer"
														download
														class="inline-flex size-9 items-center justify-center rounded-md border border-border bg-muted/40 text-foreground transition-colors hover:bg-muted"
														aria-label="Download {modelName}">
														<Icon icon={F.download} class="size-4" aria-hidden="true" />
													</a>
													<!-- eslint-enable svelte/no-navigation-without-resolve -->
												{:else if order.model.endsWith('.stl')}
													<button
														type="button"
														class="inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-border bg-muted/40 px-2 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
														disabled={downloading === index}
														aria-label={downloading === index
															? `Downloading ${modelName}, ${downloadProgress}%`
															: `Download ${modelName}`}
														onclick={() => downloadModel(order, index)}>
														{#if downloading === index}
															{downloadProgress}%
														{:else}
															<Icon icon={F.download} class="size-4" aria-hidden="true" />
														{/if}
													</button>
													{#if downloading === index && downloadProgress > 0}
														<div class="absolute inset-x-0 bottom-0 h-1 rounded-b bg-border">
															<div
																class="h-1 rounded-b bg-foreground transition-all duration-200"
																style={`width: ${downloadProgress}%`}>
															</div>
														</div>
													{/if}
												{/if}
											</div>
										{/if}
									</div>
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground"
									>{formatDate(order.created_at)}</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm">
									<div class="flex flex-wrap items-center gap-1.5">
										<span
											class={cn(
												'inline-flex items-center rounded-md border px-2 py-0.5 text-xs',
												STAGE_STYLES[order.request_stage ?? ''] ?? STAGE_STYLES.default
											)}>
											{printStageLabel(order.request_stage)}
										</span>
										{#if makerHasNextStep(order.request_stage)}
											<span
												class="inline-flex items-center rounded-md border border-foreground bg-foreground px-2 py-0.5 text-xs font-medium text-background">
												Your turn
											</span>
										{/if}
									</div>
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground"
									>{order.quote != null ? formatInr(order.quote) : '—'}</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground">
									{order.username ? order.username : 'Customer'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if page > 1 || hasOlder}
				<div class="mt-4 flex items-center justify-between gap-3 text-sm">
					<button
						type="button"
						class="rounded-md border border-border px-3 py-1.5 text-foreground transition-colors hover:bg-muted disabled:opacity-50"
						disabled={page <= 1}
						onclick={() => fetchOrders(page - 1)}>
						Newer
					</button>
					<span class="text-muted-foreground">Page {page}</span>
					<button
						type="button"
						class="rounded-md border border-border px-3 py-1.5 text-foreground transition-colors hover:bg-muted disabled:opacity-50"
						disabled={!hasOlder}
						onclick={() => fetchOrders(page + 1)}>
						Older
					</button>
				</div>
			{/if}
		{/if}
	</PortalCard>
</div>
