<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import Icon from '@iconify/svelte';
	import * as Drawer from '$lib/components/ui/drawer';
	import MessageBoard from './MessageBoard.svelte';
	import {
		Root as CollapsibleRoot,
		Trigger as CollapsibleTrigger,
		Content as CollapsibleContent
	} from '$lib/components/ui/collapsible';
	import { fade, scale, slide } from 'svelte/transition';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toastStore } from '$lib/client/toastStore';
	import { onMount } from 'svelte';

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
	let drawerOpen = $state(false);
	let selectedOrder = $state<PrintRequest | null>(null);
	let collapsibleOpen = $state(false);
	let cancelDialogOpen = $state(false);
	let cancelReason = $state('');
	let downloading = $state(-1);
	let downloadProgress = $state(0);

  //quote dialog 
  let quoteDialogOpen = $state(false);
  let quoteBreakdown = $state('');
  let quote = $state(null);
  let quoteLoading = $state(false);

  let orderUnreadCounts = $state<Record<string, number>>({});
  let chatSubscription: any = null;

  async function onSendQuote() {
    if (!quote) {
      toastStore.show('Please enter a quote', 'error');
      return;
    }
    if(!selectedOrder) {
      toastStore.show('No valid order selected', 'error');
      return;
    }
    //fetch updated order
    const updatedOrderRes = await supabase_lt.from('printrequests').select('*').eq('id', selectedOrder.id).single();
    if (updatedOrderRes.error) {
      toastStore.show('Error fetching updated order', 'error');
      return;
    }
    const updatedOrder = updatedOrderRes.data;

    quoteLoading = true;
    //update request_stage to 'quoted' && update "events"
    const updateQuote = await supabase_lt.from('printrequests').update({
      request_stage: 'quoted',
      events: [
        ...(updatedOrder?.events || []),
        { type: 'quoted', reason: quoteBreakdown, timestamp: new Date().toISOString(), by: 'maker', extra: { quote: quote } }
      ]
    }).eq('id', updatedOrder.id);
    if (updateQuote.error) {
      toastStore.show('Error updating quote', 'error');
      quoteLoading = false;
      return;
    }
    //send chat message of type 'quote'
    const chatInsert = await supabase_lt.from('Chat').insert([
      {
        sender_id: session?.data?.user?.id ?? '',
        recipient_id: updatedOrder.user_id ?? '',
  			message: JSON.stringify({ action: 'quoted', reason: quoteBreakdown, quote: quote }),
        relationship_id: updatedOrder.id,
        message_type: 'quote',
        status: 'sent'
      }
    ]);
    if (chatInsert.error) {
      toastStore.show('Error sending quote', 'error');
      quoteLoading = false;
      return;
    }
    toastStore.show('Quote sent', 'success');
    quoteLoading = false;
    quoteDialogOpen = false;
  }

	async function downloadModel(path: string,index: number) {
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

	function openOrderDrawer(order: PrintRequest) {
		drawerOpen = true;
		selectedOrder = order;
    //set unread count to 0
    orderUnreadCounts[order.id] = 0;
	}
	function closeOrderDrawer() {
		drawerOpen = false;
		selectedOrder = null;
	}

	function getStageExplanation(
		stage: string | null,
		username: string | null
	): { msg: string; turn: string } {
		if (!stage) return { msg: 'No stage information.', turn: 'maker' };
		switch (stage) {
			case 'cancelled':
				return { msg: 'This order was cancelled and requires no further action.', turn: 'closed' };
			case 'requested':
				return {
					msg: `${username} has requested a print. Please review and provide a quote.`,
					turn: 'maker'
				};
			case 'quoted':
				return { msg: 'Quote has been provided. Awaiting user action.', turn: 'user' };
			case 'actionable':
				return { msg: 'Order is actionable. Proceed with the next steps.', turn: 'user' };
			case 'paid':
				return { msg: 'Order has been paid. Begin processing the order.', turn: 'maker' };
			case 'paid_externally':
				return { msg: 'Order was paid externally. Confirm and proceed.', turn: 'maker' };
			case 'completed':
				return { msg: 'Order is completed. No further action needed.', turn: 'closed' };
			case 'in dispute':
				return { msg: 'Order is in dispute. Await resolution.', turn: 'SC Team' };
			default:
				return { msg: 'Unknown stage.', turn: 'SC Team' };
		}
	}

	function getTurn(turn: string): { msg: string; color: string } {
		switch (turn) {
			case 'maker':
				return { msg: 'Your turn', color: 'text-green-500 bg-green-500/10' };
			case 'user':
				return { msg: "The customer's turn", color: 'text-blue-500 bg-blue-500/10' };
			case 'SC Team':
				return { msg: "SC Team's review pending", color: 'text-yellow-500 bg-yellow-500/10' };
			case 'closed':
				return { msg: 'Closed', color: 'text-gray-500 bg-gray-500/10' };
			default:
				return { msg: 'Unknown turn', color: 'text-gray-500' };
		}
	}

	function cancelOrder(e: MouseEvent) {
		e.preventDefault();
		cancelDialogOpen = true;
	}

	async function onCancelCancel(e: MouseEvent) {
		e.preventDefault();
		cancelDialogOpen = false;
		cancelReason = '';
	}

	async function onConfirmCancel(e: MouseEvent) {
		e.preventDefault();
		if (!selectedOrder || !session?.data?.user?.id || !cancelReason.trim()) return;
		const prevSelectedId = selectedOrder.id;
		//repull the order data
		const updatedOrder = await supabase_lt
			.from('printrequests')
			.select('*')
			.eq('id', selectedOrder.id)
			.single();
		if (!updatedOrder.data) return;
		// 1. Send chat message of type 'action'
		await supabase_lt.from('Chat').insert([
			{
				sender_id: session.data.user.id,
				recipient_id: selectedOrder.user_id ?? '',
				message: JSON.stringify({ action: 'cancelled', reason: cancelReason }),
				relationship_id: selectedOrder.id,
				message_type: 'action',
				status: 'sent'
			}
		]);
		// 2. Update print request's request_stage
		await supabase_lt
			.from('printrequests')
			.update({
				request_stage: 'cancelled',
				last_updated: new Date().toISOString(),
				update_count: (updatedOrder.data?.update_count || 0) + 1,
				events: [
					...(updatedOrder.data?.events || []),
					{
						type: 'cancelled',
						reason: cancelReason,
						timestamp: new Date().toISOString(),
						by: 'maker'
					}
				]
			})
			.eq('id', selectedOrder.id);
		if (updatedOrder.error) {
			console.error('Error updating order', updatedOrder.error);
			return;
		}
		// 3. Close dialog and clear reason
		cancelDialogOpen = false;
		cancelReason = '';
		// 4. Refresh orders and selected order
		await fetchOrders(page);
		const updated = orders.find((o) => o.id === prevSelectedId);
		if (updated) selectedOrder = updated;
	}

	function quoteOrder(e: MouseEvent) {
		e.preventDefault();
		quoteDialogOpen = true;
	}
	function markAsShipped(e: MouseEvent) {
		e.preventDefault();
		// TODO: Implement mark as shipped logic
		alert('Mark as shipped (not implemented)');
	}
	function markAsDelivered(e: MouseEvent) {
		e.preventDefault();
		// TODO: Implement mark as delivered logic
		alert('Mark as delivered (not implemented)');
	}
	function noPaymentReceived(e: MouseEvent) {
		e.preventDefault();
		// TODO: Implement no payment received logic
		alert('No payment received (not implemented)');
	}

	async function fetchOrderUnreadCounts() {
		if (!session?.data?.user?.id) {
			orderUnreadCounts = {};
			return;
		}
		// Get all order IDs
		const orderIds = orders.map(o => o.id);
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
				{ event: 'INSERT', schema: 'public', table: 'Chat', filter: `recipient_id=eq.${session.data.user.id}` },
				(payload) => {
          if(payload.new.message_type === 'action'){
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

<div class="mt-8">
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
					{#each orders as order,index}
						<tr
							class="hover:bg-[#1f1f1f]/50 transition-colors cursor-pointer"
							onclick={() => openOrderDrawer(order)}>
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
											class="inline-flex items-center gap-1 px-3 py-1 {downloading==index
												? 'opacity-60 rounded-t'
												: 'rounded'} bg-accent/20 text-accent hover:bg-accent/40 transition-colors font-medium text-xs border border-accent/30 shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent/20"
											disabled={downloading==index || order.request_stage === 'cancelled'}
											onclick={(e) => {
												e.stopPropagation();
												//download the file
												downloadModel(order.model ?? '',index);
											}}>
											<Icon icon="ph:download-bold" class="text-accent text-base" />
											{downloading!=index
												? order.id.slice(order.id.length - 10, order.id.length)
												: 'Downloading... ' + (downloadProgress/100).toFixed(2) + '%'}
										</button>
										{:else}
											<span class="text-gray-400">{order.id.slice(order.id.length - 10, order.id.length)}</span>
										{/if}
										<!-- progress bar -->
										{#if downloading && downloadProgress > 0 && downloading==index}
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
									<span class="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
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

{#if drawerOpen && selectedOrder}
	<Drawer.Root bind:open={drawerOpen}>
		<Drawer.Trigger style="display:none" />
		<Drawer.Content
			class="max-w-3xl mx-auto h-[100vh] sm:h-[80vh] transition-all duration-200 {cancelDialogOpen || quoteDialogOpen
				? 'pointer-events-none opacity-40 blur-[2px]'
				: ''}">
			<div class="w-full flex">
				<span class="px-4 pt-2"
					>Order Details : <span class="text-sm font-normal sm:hidden"
						>{selectedOrder.id.substring(
							selectedOrder.id.length - 10,
							selectedOrder.id.length
						)}</span
					></span
				><span class="flex-1"></span><button
					onclick={closeOrderDrawer}
					class="hover:bg-gray-700/50 rounded-full p-1"
					><Icon icon="line-md:close-small" class="text-white text-3xl" /></button>
			</div>
			<div class="px-4 gap-y-4 gap-x-4 flex-col flex mb-4">
				<CollapsibleRoot bind:open={collapsibleOpen}>
					<CollapsibleTrigger class="w-full cursor-pointer focus:outline-none">
						<div class="flex flex-wrap gap-x-16 xs:gap-x-8 gap-y-4 items-center">
							<div class="flex flex-col gap-1 max-sm:hidden">
								<span class="text-xs text-gray-400 text-start">Order ID</span>
								<span class="font-mono text-base text-accent text-start"
									>{selectedOrder.id.substring(
										selectedOrder.id.length - 10,
										selectedOrder.id.length
									)}</span>
							</div>
							<div class="flex flex-col gap-1">
								<span class="text-xs text-gray-400 text-start">Created At</span>
								<span class="text-start">{formatDate(selectedOrder.created_at)}</span>
							</div>
							<div class="flex flex-col gap-1 text-start">
								<span class="text-xs text-gray-400">Stage</span>
								<span
									class={`px-2 py-1 w-fit rounded-full text-xs font-semibold ${STAGE_COLORS[selectedOrder.request_stage ?? ''] || 'bg-gray-700 text-gray-200'}`}
									>{selectedOrder.request_stage
										?.replace('_', ' ')
										.replace(/\b\w/g, (l) => l.toUpperCase()) ?? 'N/A'}</span>
							</div>
							<div class="ml-auto">
								<Icon
									icon="ph:caret-down-bold"
									class="text-accent text-xl transition-transform duration-200 animate-pulse {collapsibleOpen
										? 'rotate-180'
										: ''}" />
							</div>
						</div>
					</CollapsibleTrigger>
					<CollapsibleContent forceMount>
						{#if collapsibleOpen}
							<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
							<div
								class="flex flex-col gap-y-4 mt-4"
								tabindex="0"
								onblur={() => (collapsibleOpen = false)}
								in:slide={{ axis: 'y', duration: 100 }}
								out:slide={{ axis: 'y', duration: 100 }}>
								{#if selectedOrder}
									{@const { msg, turn } = getStageExplanation(
										selectedOrder.request_stage,
										selectedOrder.username ?? 'A User'
									)}
									<div class="flex flex-col gap-1">
										<span class="text-xs text-gray-400"
											>Stage Info:
											<span class="text-xs w-fit {getTurn(turn).color} rounded-full px-2 py-1"
												>{getTurn(turn).msg}</span>
										</span>
										<span class="text-md">{msg}</span>
									</div>
									{#if selectedOrder.quote}
										<div class="flex flex-col gap-1">
											<span class="text-xs text-gray-400">Quote</span>
											<span>{selectedOrder.quote ?? '—'}</span>
										</div>
									{/if}
									<div class="flex flex-col gap-1">
										<span class="text-xs text-gray-400">Ordered By</span>
										<span
											>{selectedOrder.username
												? selectedOrder.username
												: selectedOrder.user_id
													? selectedOrder.user_id.slice(0, 8) + '...'
													: 'N/A'}</span>
									</div>
									<!-- model data-->
									<div class="flex flex-col gap-1">
										<span class="text-xs text-gray-400">Model Data</span>
										<div class="flex flex-wrap gap-x-2 gap-y-2">
											<div class="flex flex-col bg-accent/5 border border-accent/10 rounded-md p-2">
												<span class="text-xs text-gray-400">Color</span>
												<span class="flex gap-x-2 mt-1">
													<!-- show color in a small cube-->
													<span
														class="w-4 h-4 rounded"
														style="background-color:{selectedOrder.model_data?.color ?? '#fff'}"
														></span>
													<span
														class="text-sm font-mono"
														style="color:{selectedOrder.model_data?.color ?? '#fff'}"
														>{selectedOrder.model_data?.color ?? 'N/A'}</span
													>
                        </span>
											</div>
											<div class="flex flex-col bg-accent/5 border border-accent/10 rounded-md p-2">
												<span class="text-xs text-gray-400">Scale</span>
												<span>{selectedOrder.model_data?.scale ?? '1'}x</span>
											</div>
											<div class="flex flex-col bg-accent/5 border border-accent/10 rounded-md p-2">
												<span class="text-xs text-gray-400">Material</span>
												<span>{selectedOrder.model_data?.material ?? 'N/A'}</span>
											</div>
											<div class="flex flex-col bg-accent/5 border border-accent/10 rounded-md p-2">
												<span class="text-xs text-gray-400">Quality</span>
												<span>{selectedOrder.model_data?.quality ?? 'N/A'}</span>
											</div>
											<div class="flex flex-col bg-accent/5 border border-accent/10 rounded-md p-2">
												<span class="text-xs text-gray-400">Infill</span>
												<span>{selectedOrder.model_data?.infill ?? 'N/A'}</span>
											</div>
											<div class="flex flex-col bg-accent/5 border border-accent/10 rounded-md p-2">
												<span class="text-xs text-gray-400">Walls</span>
												<span>{selectedOrder.model_data?.walls ?? 'N/A'}</span>
											</div>
										</div>
									</div>
									<div class="flex flex-col gap-1 w-fit">
										<span class="text-xs text-gray-400">Actions</span>
										<div class="flex flex-row gap-2 items-center">
											{#if isUrl(selectedOrder.model)}
												<a
													href={selectedOrder.model}
													target="_blank"
													rel="noopener noreferrer"
													class="inline-flex items-center gap-1 px-3 py-1 rounded bg-accent/20 text-accent hover:bg-accent/40 transition-colors font-medium text-xs border border-accent/30 shadow"
													download>
													<Icon icon="ph:download-bold" class="text-accent text-base" />
													STL
												</a>
											{:else if selectedOrder?.model?.endsWith('.stl') && selectedOrder.request_stage !== 'cancelled'}
												<div class="relative">
													<button
														class="inline-flex items-center gap-1 px-3 py-1 rounded bg-accent/20 text-accent hover:bg-accent/40 transition-colors font-medium text-xs border border-accent/30 shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent/20"
														disabled={downloading!=-1 || selectedOrder.request_stage === 'cancelled'}
														onclick={(e) => {
															e.stopPropagation();
															//download the file
															downloadModel(selectedOrder?.model ?? '',99999999);
														}}>
														<Icon icon="ph:download-bold" class="text-accent text-base" />
														{downloading==-1 ? 'STL' : 'Downloading...'}
													</button>
													{#if downloading && downloadProgress > 0}
														<div class="absolute left-0 rounded-b right-0 bg-accent/20 h-1">
															<div
																class="bg-accent h-1 transition-all duration-200"
																style={`width: ${downloadProgress}%`}>
															</div>
														</div>
													{/if}
												</div>
											{/if}
												{#if selectedOrder.request_stage === 'requested'}
													<button
														class="px-3 py-1 rounded bg-red-600/20 text-red-500 hover:bg-red-600/40 border border-red-600/30 text-xs font-medium transition-colors"
														onclick={cancelOrder}>Cancel</button>
													<button
														class="px-3 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 border border-blue-500/30 text-xs font-medium transition-colors"
														onclick={quoteOrder}>Quote</button>
												{:else if selectedOrder.request_stage === 'quoted'}
													<button
														class="px-3 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 border border-blue-500/30 text-xs font-medium transition-colors"
														onclick={quoteOrder}>Re-Quote</button>
												{:else if selectedOrder.request_stage === 'paid'}
													<button
														class="px-3 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/40 border border-green-500/30 text-xs font-medium transition-colors"
														onclick={markAsShipped}>Mark as Shipped</button>
													<button
														class="px-3 py-1 rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40 border border-yellow-500/30 text-xs font-medium transition-colors"
														onclick={markAsDelivered}>Mark as Delivered</button>
												{:else if selectedOrder.request_stage === 'paid_externally'}
													<button
														class="px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/30 text-xs font-medium transition-colors"
														onclick={noPaymentReceived}>No Payment Rcvd</button>
													<button
														class="px-3 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/40 border border-green-500/30 text-xs font-medium transition-colors"
														onclick={markAsShipped}>Mark as Shipped</button>
													<button
														class="px-3 py-1 rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40 border border-yellow-500/30 text-xs font-medium transition-colors"
														onclick={markAsDelivered}>Mark as Delivered</button>
												{/if}
											<a
												href="https://discord.gg/k6CC6GTR4g"
												target="_blank"
												rel="noopener noreferrer"
												class="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/30 text-xs font-medium transition-colors"
												title="Get help on Discord">
												<Icon icon="ph:discord-logo-duotone" class="text-red-400 text-base" />
												Help
											</a>
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</CollapsibleContent>
				</CollapsibleRoot>
			</div>
			<MessageBoard
				orderId={selectedOrder.id}
				{supabase_lt}
				{session}
				receiverId={selectedOrder.user_id ?? ''}
				disabled={selectedOrder.request_stage === 'cancelled' ||
					selectedOrder.request_stage === 'completed'} />
		</Drawer.Content>
	</Drawer.Root>
{/if}

<Dialog.Root bind:open={quoteDialogOpen}>
	<Dialog.Content class="z-[1050]">
		<Dialog.Header>
			<Dialog.Title>Quote Order</Dialog.Title>
			<Dialog.Description>
				Please provide a quote for the order.
			</Dialog.Description>
		</Dialog.Header>
		<Textarea disabled={quoteLoading} bind:value={quoteBreakdown} class="w-full mt-4" placeholder="Enter quote breakdown (optional)" />
    <!-- quote inr floating input-->
    <div class="flex flex-col gap-2">
      <span class="text-xs text-gray-400">Quote - Final Price (₹)</span>
      <div class="flex flex-row gap-2 items-center">
        <span class="text-sm text-gray-400">₹</span>
        <input disabled={quoteLoading} type="number" bind:value={quote} class="w-full rounded-md p-2 bg-accent/5 border border-accent/10 text-sm text-gray-400 placeholder:text-gray-400 placeholder:opacity-50" placeholder="Enter price like : 249.99" />
      </div>
    </div>
		<Dialog.Footer class="flex justify-end gap-3 mt-6">
			<button
				class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
				onclick={onCancelCancel}>Cancel</button>
			<button
				class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent-dark/30 hover:bg-accent-dark/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				onclick={onSendQuote}
				disabled={!quote || quoteLoading}>
				<Icon icon="ph:paper-plane-right-duotone" class="text-base" />
				Send Quote
			{#if quoteLoading}
				<Icon icon="line-md:loading-twotone-loop" class="text-base animate-spin" />
			{/if}
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>


<Dialog.Root bind:open={cancelDialogOpen}>
	<Dialog.Content class="z-[1050]">
		<Dialog.Header>
			<Dialog.Title>Cancel Order</Dialog.Title>
			<Dialog.Description>
				Please provide a reason for cancellation. This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Textarea bind:value={cancelReason} class="w-full mt-4" placeholder="Enter reason..." />
		<Dialog.Footer>
			<button
				class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 transition-colors mr-2"
				onclick={onCancelCancel}>Cancel</button>
			<button
				class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
				onclick={onConfirmCancel}
				disabled={!cancelReason.trim()}>Confirm</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
