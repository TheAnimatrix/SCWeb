<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import Icon from '@iconify/svelte';
	import {
		Drawer as DrawerRoot,
		DrawerContent,
		DrawerHeader,
		DrawerTitle,
		DrawerDescription,
		DrawerFooter,
		DrawerClose,
		DrawerTrigger
	} from '../ui/drawer';
	import MessageBoard from './MessageBoard.svelte';
	import {
		Root as CollapsibleRoot,
		Trigger as CollapsibleTrigger,
		Content as CollapsibleContent
	} from '$lib/components/ui/collapsible';
	import { fade, scale } from 'svelte/transition';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';

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
	let dialogOpen = $state(false);
	let cancelReason = $state('');

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
		console.log('openOrderDrawer', order);
		drawerOpen = true;
		selectedOrder = order;
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
		dialogOpen = true;
	}

	async function onCancel(e: MouseEvent) {
		e.preventDefault();
		dialogOpen = false;
		cancelReason = '';
	}

	async function onConfirm(e: MouseEvent) {
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
		dialogOpen = false;
		cancelReason = '';
		// 4. Refresh orders and selected order
		await fetchOrders(page);
		const updated = orders.find((o) => o.id === prevSelectedId);
		if (updated) selectedOrder = updated;
	}

	function quoteOrder(e: MouseEvent) {
		e.preventDefault();
		// TODO: Implement quote logic
		alert('Quote order (not implemented)');
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

	function fadeScale(node: Element, params: any) {
		return {
			...fade(node, params),
			...scale(node, params)
		};
	}

	// Custom slideY transition for animating height
	function slideY(node: Element, { duration = 250, baseScale = 0.98 } = {}) {
		const style = getComputedStyle(node);
		const height = parseFloat(style.height);
		return {
			duration,
			css: (t: number) => `
				opacity: ${t};
				height: ${t * height}px;
				transform: scaleY(${baseScale + (1 - baseScale) * t});
			`
		};
	}

	$effect(() => {
		function setInitialCollapsible() {
			if (typeof window !== 'undefined') {
				collapsibleOpen = window.innerWidth >= 768;
			}
		}
		setInitialCollapsible();
		window.addEventListener('resize', setInitialCollapsible);
		return () => window.removeEventListener('resize', setInitialCollapsible);
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
					{#each orders as order}
						<tr
							class="hover:bg-[#1f1f1f]/50 transition-colors cursor-pointer"
							onclick={() => openOrderDrawer(order)}>
							<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
								{#if isUrl(order.model)}
									<a
										href={order.model}
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-center gap-1 px-3 py-1 rounded bg-accent/20 text-accent hover:bg-accent/40 transition-colors font-medium text-xs border border-accent/30 shadow"
										download
										onclick={(e) => {
											e.stopPropagation();
										}}>
										<Icon icon="ph:download-bold" class="text-accent text-base" />
										{order.id.slice(order.id.length - 10, order.id.length)}
									</a>
								{:else}
									{order.id.slice(order.id.length - 10, order.id.length)}
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
	<DrawerRoot bind:open={drawerOpen}>
		<DrawerTrigger style="display:none" />
		<DrawerContent
			class="max-w-2xl mx-auto h-[100vh] sm:h-[80vh] transition-all duration-200 {dialogOpen
				? 'pointer-events-none opacity-60'
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
									icon={collapsibleOpen ? 'ph:caret-up-bold' : 'ph:caret-down-bold'}
									class="text-gray-400 text-xl transition-transform duration-200" />
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
								transition:slideY={{ duration: 100, baseScale: 0.98 }}>
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
									{#if isUrl(selectedOrder.model)}
										<div class="flex flex-col gap-1 w-fit">
											<span class="text-xs text-gray-400">Actions</span>
											<div class="flex flex-row gap-2 items-center">
												<a
													href={selectedOrder.model}
													target="_blank"
													rel="noopener noreferrer"
													class="inline-flex items-center gap-1 px-3 py-1 rounded bg-accent/20 text-accent hover:bg-accent/40 transition-colors font-medium text-xs border border-accent/30 shadow"
													download>
													<Icon icon="ph:download-bold" class="text-accent text-base" />
													STL
												</a>
												{#if (() => {
													const { turn } = getStageExplanation(selectedOrder.request_stage, selectedOrder.username ?? 'A User');
													return turn === 'maker';
												})()}
													{#if selectedOrder.request_stage === 'requested'}
														<button
															class="px-3 py-1 rounded bg-red-600/20 text-red-500 hover:bg-red-600/40 border border-red-600/30 text-xs font-medium transition-colors"
															onclick={cancelOrder}>Cancel</button>
														<button
															class="px-3 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 border border-blue-500/30 text-xs font-medium transition-colors"
															onclick={quoteOrder}>Quote</button>
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
		</DrawerContent>
	</DrawerRoot>
{/if}

<Dialog.Root bind:open={dialogOpen}>
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
				onclick={onCancel}>Cancel</button>
			<button
				class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
				onclick={onConfirm}
				disabled={!cancelReason.trim()}>Confirm</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
