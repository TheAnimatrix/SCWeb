<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import Icon from '@iconify/svelte';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import { toastStore } from '$lib/client/toastStore';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { PortalCard, PortalSectionLabel } from '$lib/components/portal';
	import { TableBodySkeleton } from '$lib/components/sc';
	import { cn } from '$lib/utils';

	let {
		supabase_lt,
		session
	}: { supabase_lt: SupabaseClient; session: { data: { user: { id: string } } } | null } = $props();

	interface PrintRequest {
		id: string;
		created_at: string;
		model: string | null;
		request_stage: string | null;
		quote: number | null;
		user_id: string | null;
		username?: string | null;
		model_metadata: any;
		model_data: {
			color: string;
			scale: string;
			material: string;
			quality: string;
			infill: string;
			walls: string;
		};
		events?: {
			type: string;
			reason: string;
			timestamp: string;
			by: 'maker' | 'user' | 'SC Team';
		}[];
		update_count?: number;
	}

	let orders = $state<PrintRequest[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let page = $state(1);
	let pageSize = 50;
	let downloading = $state(-1);
	let downloadProgress = $state(0);

	let orderUnreadCounts = $state<Record<string, number>>({});
	let chatSubscription: any = null;

	async function downloadModel(path: string, index: number) {
		let modelName: any = path.split('/').pop()?.split('.');
		let modelName2 = modelName?.[modelName.length - 2]?.split('_');
		modelName = `${modelName2?.[modelName2.length - 1]}.${modelName?.[modelName.length - 1]}`;
		if (!path) return;
		const { data: userRes, error: userErr } = await supabase_lt.auth.getSession();
		if (userErr || !userRes?.session?.access_token) {
			toastStore.show('You must be logged in to request a quote', 'error');
			return;
		}
		const jwt = userRes.session.access_token;
		if (!jwt) {
			alert('Session expired or not found. Please log in again.');
			downloading = -1;
			return;
		}
		downloading = index;
		downloadProgress = 0;
		try {
			const res = await fetch(
				'https://pfeewicqoxkuwnbuxnoz.supabase.co/functions/v1/download-model-request',
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
					body: JSON.stringify({ model_url: path })
				}
			);
			const result = await res.json();
			if (result?.url) {
				// Use XMLHttpRequest for progress tracking
				const xhr = new XMLHttpRequest();
				xhr.open('GET', result.url, true);
				xhr.responseType = 'blob';
				xhr.onprogress = (event) => {
					if (event.lengthComputable) {
						downloadProgress = Math.round((event.loaded / event.total) * 100);
					}
				};
				xhr.onload = function () {
					if (xhr.status === 200) {
						const url = window.URL.createObjectURL(xhr.response);
						const a = document.createElement('a');
						a.href = url;
						a.download = modelName;
						document.body.appendChild(a);
						a.click();
						setTimeout(() => {
							window.URL.revokeObjectURL(url);
							document.body.removeChild(a);
						}, 100);
					} else {
						alert('Failed to download file');
					}
					downloading = -1;
					downloadProgress = 0;
				};
				xhr.onerror = function () {
					alert('Error downloading model');
					downloading = -1;
					downloadProgress = 0;
				};
				xhr.send();
			} else {
				alert(result?.error || 'Failed to get download link');
				downloading = -1;
				downloadProgress = 0;
			}
		} catch (e) {
			alert('Error downloading model');
		} finally {
			// Only reset if not downloading (handled in xhr events)
		}
	}

	async function fetchOrders(newPage = 1) {
		if (!session?.data?.user?.id) {
			orders = [];
			isLoading = false;
			error = 'No session or user.';
			return;
		}
		isLoading = true;
		error = null;
		page = newPage;
		try {
			const res = await fetch(`/user/maker/orders?page=${page}&pageSize=${pageSize}`);
			if (!res.ok) {
				const err = await res.json();
				error = err.error || 'Failed to fetch orders.';
				orders = [];
				return;
			}
			const result = await res.json();
			console.log(result);
			orders = result.orders || [];
			page = result.page || 1;
		} catch (e: any) {
			error = e.message || 'Unknown error';
			orders = [];
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		fetchOrders();
	});

	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		const day = date.getDate();
		const month = date.toLocaleString('en-US', { month: 'short' });
		const year = date.getFullYear();
		// Suffix for day
		const j = day % 10,
			k = day % 100;
		let suffix = 'th';
		if (j === 1 && k !== 11) suffix = 'st';
		else if (j === 2 && k !== 12) suffix = 'nd';
		else if (j === 3 && k !== 13) suffix = 'rd';
		return `${day}${suffix} ${month} ${year}`;
	}

	const STAGES = [
		'cancelled',
		'requested',
		'quoted',
		'actionable',
		'paid',
		'paid_externally',
		'completed',
		'in dispute'
	];

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
		const { data, error } = await supabase_lt
			.from('Chat')
			.select('relationship_id')
			.in('relationship_id', orderIds)
			.eq('recipient_id', session.data.user.id)
			.eq('status', 'sent');
		// Count per order
		const counts: Record<string, number> = {};
		if (Array.isArray(data)) {
			for (const row of data) {
				counts[row.relationship_id] = (counts[row.relationship_id] || 0) + 1;
			}
		}
		orderUnreadCounts = counts;
	}

	function subscribeToChat() {
		if (!session?.data?.user?.id) return;
		chatSubscription = supabase_lt
			.channel('realtime-chat-global')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'Chat',
					filter: `recipient_id=eq.${session.data.user.id}`
				},
				(payload) => {
					if (payload.new.message_type === 'action') {
						//update orders
						fetchOrders(page);
					}
					if (payload.new?.sender_id !== session.data.user.id) {
						toastStore.show('New chat message received!', 'info');
						fetchOrderUnreadCounts();
					}
				}
			)
			.subscribe();
	}

	$effect(() => {
		fetchOrderUnreadCounts();
	});

	onMount(() => {
		subscribeToChat();
		return () => {
			if (chatSubscription) supabase_lt.removeChannel(chatSubscription);
		};
	});
</script>

<div id="orderManagement">
	<PortalCard>
		<PortalSectionLabel label="order_management" class="mb-4" />

		{#if isLoading}
			<div class="overflow-x-auto rounded-md border border-border">
				<table class="min-w-full divide-y divide-border text-left">
					<thead class="bg-muted/30">
						<tr>
							<th class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
								>ID</th>
							<th class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
								>Date</th>
							<th class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
								>Stage</th>
							<th class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
								>Quote</th>
							<th class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
								>Ordered by</th>
						</tr>
					</thead>
					<TableBodySkeleton rows={5} columns={5} />
				</table>
			</div>
		{:else if error}
			<div class="py-10 text-center text-sm text-destructive">{error}</div>
		{:else if orders.length === 0}
			<div class="py-10 text-center text-sm text-muted-foreground">
				No print requests found for you yet.
			</div>
		{:else}
			<div class="overflow-x-auto rounded-md border border-border">
				<table class="min-w-full divide-y divide-border text-left">
					<thead class="bg-muted/30">
						<tr>
							<th class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
								>ID</th>
							<th class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
								>Date</th>
							<th class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
								>Stage</th>
							<th class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
								>Quote</th>
							<th class="px-4 py-3 font-mono text-xs uppercase tracking-wide text-muted-foreground"
								>Ordered by</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each orders as order, index}
							<tr
								class="cursor-pointer transition-colors hover:bg-muted/20"
								onclick={() => goto(`/3dp-portal/maker/${order.id}`)}>
								<td
									class="flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm text-foreground">
									{#if isUrl(order.model)}
										<a
											href={order.model}
											target="_blank"
											rel="noopener noreferrer"
											class="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-3 py-1 font-mono text-xs text-foreground transition-colors hover:bg-muted"
											download
											onclick={(e) => e.stopPropagation()}>
											<Icon icon="ph:download-bold" class="text-base" />
											{order.id.slice(order.id.length - 10, order.id.length)}
										</a>
									{:else if order.model?.endsWith('.stl')}
										<div class="relative w-fit">
											{#if order.request_stage !== 'cancelled'}
												<button
													type="button"
													class={cn(
														'inline-flex items-center gap-1 border border-border bg-muted/40 px-3 py-1 font-mono text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
														downloading === index ? 'rounded-t opacity-60' : 'rounded'
													)}
													disabled={downloading === index || order.request_stage === 'cancelled'}
													onclick={(e) => {
														e.stopPropagation();
														downloadModel(order.model ?? '', index);
													}}>
													<Icon icon="ph:download-bold" class="text-base" />
													{downloading !== index
														? order.id.slice(order.id.length - 10, order.id.length)
														: `Downloading… ${downloadProgress}%`}
												</button>
											{:else}
												<span class="font-mono text-xs text-muted-foreground"
													>{order.id.slice(order.id.length - 10, order.id.length)}</span>
											{/if}
											{#if downloading && downloadProgress > 0 && downloading === index}
												<div class="absolute inset-x-0 bottom-0 h-1 rounded-b bg-border">
													<div
														class="h-1 rounded-b bg-foreground transition-all duration-200"
														style={`width: ${downloadProgress}%`}>
													</div>
												</div>
											{/if}
										</div>
									{:else}
										<span class="font-mono text-xs text-muted-foreground"
											>{order.id.slice(order.id.length - 10, order.id.length)}</span>
									{/if}
									{#if orderUnreadCounts[order.id] > 0}
										<span
											class="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive px-1.5 py-0.5 font-mono text-xs text-destructive-foreground">
											<MessageSquare class="size-3" strokeWidth={2} />
											{orderUnreadCounts[order.id]}
										</span>
									{/if}
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground"
									>{formatDate(order.created_at)}</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm">
									{#if order.request_stage}
										<span
											class={cn(
												'inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs capitalize',
												STAGE_STYLES[order.request_stage] ?? STAGE_STYLES.default
											)}>
											{order.request_stage.replace('_', ' ')}
										</span>
									{:else}
										<span
											class="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs text-muted-foreground">
											N/A
										</span>
									{/if}
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground"
									>{order.quote ?? '—'}</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-foreground">
									{order.username
										? order.username
										: order.user_id
											? order.user_id.slice(0, 8) + '...'
											: 'N/A'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</PortalCard>
</div>
