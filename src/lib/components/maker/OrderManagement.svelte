<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import Icon from '@iconify/svelte';
	import { toastStore } from '$lib/client/toastStore';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

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

	const STAGE_COLORS: Record<string, string> = {
		cancelled: 'bg-red-500 text-white',
		requested: 'bg-gray-500 text-white',
		quoted: 'bg-blue-500 text-white',
		actionable: 'bg-yellow-500 text-black',
		paid: 'bg-green-600 text-white',
		paid_externally: 'bg-green-400 text-black',
		completed: 'bg-accent text-black',
		'in dispute': 'bg-orange-500 text-white'
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

<div class="mt-8" id="orderManagement">
	<div class="text-xl font-semibold text-white/60 mb-2 text-left pl-1 tracking-wide">
		Order Management
	</div>
	<div
		class="overflow-x-auto bg-[#151515]/60 rounded-lg sm:p-4 xs:px-0 xs:pt-0 border border-gray-700/50">
		{#if isLoading}
			<div class="flex justify-center items-center py-10 text-gray-400">
				<span class="animate-spin mr-2">⏳</span> Loading orders...
			</div>
		{:else if error}
			<div class="text-red-400 py-10 text-center">{error}</div>
		{:else if orders.length === 0}
			<div class="text-gray-400 py-10 text-center">No print requests found for you yet.</div>
		{:else}
			<table class="min-w-full divide-y divide-gray-700 text-left">
				<thead class="bg-[#0c0c0c]/50">
					<tr>
						<th class="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"
							>Date</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"
							>Stage</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"
							>Quote</th>
						<th class="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"
							>Ordered by
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-700/50">
					{#each orders as order, index}
						<tr
							class="hover:bg-[#1f1f1f]/50 transition-colors cursor-pointer"
							onclick={() => goto(`/3dp-portal/maker/${order.id}`)}>
							<!-- openOrderDrawer(order) -->
							<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-300 flex items-center gap-2">
								{#if isUrl(order.model)}
									<a
										href={order.model}
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-center gap-1 px-3 py-1 rounded bg-accent/20 text-accent hover:bg-accent/40 transition-colors font-medium text-xs border border-accent/30 shadow"
										download>
										<Icon icon="ph:download-bold" class="text-accent text-base" />
										{order.id.slice(order.id.length - 10, order.id.length)}
									</a>
								{:else if order.model?.endsWith('.stl')}
									<div class="relative w-fit">
										{#if order.request_stage !== 'cancelled'}
											<button
												class="inline-flex items-center gap-1 px-3 py-1 {downloading == index
													? 'opacity-60 rounded-t'
													: 'rounded'} bg-accent/20 text-accent hover:bg-accent/40 transition-colors font-medium text-xs border border-accent/30 shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent/20"
												disabled={downloading == index || order.request_stage === 'cancelled'}
												onclick={(e) => {
													e.stopPropagation();
													//download the file
													downloadModel(order.model ?? '', index);
												}}>
												<Icon icon="ph:download-bold" class="text-accent text-base" />
												{downloading != index
													? order.id.slice(order.id.length - 10, order.id.length)
													: 'Downloading... ' + (downloadProgress / 100).toFixed(2) + '%'}
											</button>
										{:else}
											<span class="text-gray-400"
												>{order.id.slice(order.id.length - 10, order.id.length)}</span>
										{/if}
										<!-- progress bar -->
										{#if downloading && downloadProgress > 0 && downloading == index}
											<div class="absolute left-0 rounded-b right-0 bg-accent/20 h-1">
												<div
													class="bg-accent h-1 transition-all duration-200"
													style={`width: ${downloadProgress}%`}>
												</div>
											</div>
										{/if}
									</div>
								{:else}
									{order.id.slice(order.id.length - 10, order.id.length)}
								{/if}
								{#if orderUnreadCounts[order.id] > 0}
									<span
										class="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
										<Icon icon="ph:chat-circle-dots" class="text-white text-xs mr-0.5" />
										{orderUnreadCounts[order.id]}
									</span>
								{/if}
							</td>
							<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-300"
								>{formatDate(order.created_at)}</td>
							<td class="px-4 py-3 whitespace-nowrap text-sm">
								{#if order.request_stage}
									<span
										class={`px-2 py-1 rounded-full text-xs font-semibold transition-colors 
                    ${STAGE_COLORS[order.request_stage] || 'bg-gray-700 text-gray-200'}`}>
										{order.request_stage.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
									</span>
								{:else}
									<span
										class="px-2 py-1 rounded-full text-xs font-semibold bg-gray-700 text-gray-200"
										>N/A</span>
								{/if}
							</td>
							<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-300"
								>{order.quote ?? '—'}</td>
							<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
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
		{/if}
	</div>
</div>
