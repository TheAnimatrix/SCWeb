<script lang="ts">
	import MessageBoard from '$lib/components/maker/MessageBoard.svelte';
	import Icon from '@iconify/svelte';
	import { toastStore } from '$lib/client/toastStore';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { goto, invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	let { data } = $props();

	let req = $state(data.printRequest);
	let sortedEvents = $derived(
		req.events
			? [...req.events].filter((event: any) => event.type !== 'order_created').sort(
					(a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
				)
			: []
	);
	$effect(() => {
		req = data.printRequest;
	});

	let downloading = $state(false);
	let messageBoardOpen = $state(false);
	let cancelDialogOpen = $state(false);
	let cancelReason = $state('');
	let downloadProgress = $state(0);
	let unreadCount = $state(0);

	let modelName = req.model?.split('/').pop().split('.');
	let modelName2 = modelName[modelName.length - 2].split('_');
	modelName = `${modelName2[modelName2.length - 1]}.${modelName[modelName.length - 1]}`;
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

	// Add a mapping for stage colors
	const STAGE_COLORS: { [key: string]: string } = {
		cancelled: 'bg-red-500/10 text-red-400 border-red-400/20',
		requested: 'bg-accent/10 text-accent border-accent/20',
		quoted: 'bg-purple-500/10 text-purple-400 border-purple-400/20',
		actionable: 'bg-orange-500/10 text-orange-400 border-orange-400/20',
		paid: 'bg-green-500/10 text-green-400 border-green-400/20',
		paid_externally: 'bg-green-500/10 text-green-400 border-green-400/20',
		completed: 'bg-gray-500/10 text-gray-300 border-gray-400/20',
		'in dispute': 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20',
		default: 'bg-accent/10 text-accent border-accent/10'
	};

	const STAGE_DESCRIPTIONS: { [key: string]: string } = {
		cancelled: 'The request has been cancelled.',
		requested: 'The user has requested a quote for a 3D print. Please provide a quote.',
		quoted: 'You have quoted the user. Please wait for them to review and accept or reject it.',
		actionable: 'You have requested an action from the user. Please wait for their response.',
		paid: 'The user has paid for the 3D print. Please complete the print and ship it.',
		paid_externally: 'The user has paid for the 3D print externally. Please complete the print and ship it.',
		completed:
			'The user has acknowledged the receipt of the 3D print. Please wait for their review.',
		'in dispute': 'The request is in dispute. Our Team will intervene to resolve the dispute.',
		default: 'The request is in default.'
	};

	async function quoteOrder() {
		quoteDialogOpen = true;
	}

	let shippedDialogOpen = $state(false);
	let courierName = $state('');
	let trackingId = $state('');
	let trackingLink = $state('');
	let shippedLoading = $state(false);
	let shippedError = $state('');

	async function onOpenShippedDialog() {
		courierName = '';
		trackingId = '';
		trackingLink = '';
		shippedError = '';
		shippedDialogOpen = true;
	}

	async function onCancelShipped(e: MouseEvent) {
		e.preventDefault();
		shippedDialogOpen = false;
		courierName = '';
		trackingId = '';
		trackingLink = '';
		shippedError = '';
	}

	async function onConfirmShipped(e: MouseEvent) {
		e.preventDefault();
		shippedError = '';
		if (!courierName.trim()) {
			shippedError = 'Courier Name is required.';
			return;
		}
		if (!trackingId.trim() && !trackingLink.trim()) {
			shippedError = 'Please provide either Tracking ID or Tracking Link.';
			return;
		}
		
		if (trackingLink.trim() && !isValidUrl(trackingLink)) {
			shippedError = 'Please provide a valid tracking link.';
			return;
		}
		
		function isValidUrl(string: string) {
			try {
				new URL(string);
				return true;
			} catch (_) {
				return false;
			}
		}
		if (!req.id || !data.session?.data?.user?.id) {
			shippedError = 'Order/session missing.';
			return;
		}
		shippedLoading = true;
		// Fetch updated order
		const updatedOrderRes = await data.supabase_lt
			.from('printrequests')
			.select('*')
			.eq('id', req.id)
			.single();
		if (updatedOrderRes.error || !updatedOrderRes.data) {
			shippedError = 'Error fetching updated order.';
			shippedLoading = false;
			return;
		}
		const updatedOrder = updatedOrderRes.data;
		// 1. Send chat message of type 'action'
		const chatInsert = await data.supabase_lt.from('Chat').insert([
			{
				sender_id: data.session.data.user.id,
				recipient_id: updatedOrder.user_id ?? '',
				message: JSON.stringify({
					action: 'shipped',
					courier: courierName,
					tracking_id: trackingId,
					tracking_link: trackingLink
				}),
				relationship_id: updatedOrder.id,
				message_type: 'action',
				status: 'sent'
			}
		]);
		if (chatInsert.error) {
			shippedError = 'Error sending shipped message.';
			shippedLoading = false;
			return;
		}
		// 2. Update print request's request_stage and events
		const updateRes = await data.supabase_lt
			.from('printrequests')
			.update({
				request_stage: 'shipped',
				last_updated: new Date().toISOString(),
				update_count: (updatedOrder?.update_count || 0) + 1,
				events: [
					...(updatedOrder?.events || []),
					{
						type: 'shipped',
						reason: `Courier: ${courierName}, Tracking ID: ${trackingId}, Tracking Link: ${trackingLink}`,
						timestamp: new Date().toISOString(),
						by: 'maker',
						extra: { courier: courierName, tracking_id: trackingId, tracking_link: trackingLink }
					}
				]
			})
			.eq('id', updatedOrder.id);
		if (updateRes.error) {
			shippedError = 'Error updating print request.';
			shippedLoading = false;
			return;
		}
		shippedDialogOpen = false;
		shippedLoading = false;
		courierName = '';
		trackingId = '';
		trackingLink = '';
		shippedError = '';
		invalidate('3dp-portal:printrequest');
		toastStore.show('Order marked as shipped!', 'success');
	}

	async function downloadModel() {
		if (!req?.model) return;
		const { data: userRes, error: userErr } = await data.supabase_lt.auth.getSession();
		if (userErr || !userRes?.session?.access_token) {
			toastStore.show('You must be logged in to request a quote', 'error');
			return;
		}
		const jwt = userRes.session.access_token;
		if (!jwt) {
			alert('Session expired or not found. Please log in again.');
			downloading = false;
			return;
		}
		downloading = true;
		downloadProgress = 0;
		try {
			const res = await fetch(
				'https://pfeewicqoxkuwnbuxnoz.supabase.co/functions/v1/download-model-request',
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
					body: JSON.stringify({ model_url: req.model })
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
					downloading = false;
					downloadProgress = 0;
				};
				xhr.onerror = function () {
					alert('Error downloading model');
					downloading = false;
					downloadProgress = 0;
				};
				xhr.send();
			} else {
				alert(result?.error || 'Failed to get download link');
				downloading = false;
				downloadProgress = 0;
			}
		} catch (e) {
			alert('Error downloading model');
		} finally {
			// Only reset if not downloading (handled in xhr events)
		}
	}

	let quoteLoading = $state(false);
	let quoteDialogOpen = $state(false);
	let quote = $state('');
	let quoteBreakdown = $state('');
	async function onSendQuote() {
		if (!quote) {
			toastStore.show('Please enter a quote', 'error');
			return;
		}
		if (!req.id) {
			toastStore.show('No valid order selected', 'error');
			return;
		}
		//fetch updated order
		const updatedOrderRes = await data.supabase_lt
			.from('printrequests')
			.select('*')
			.eq('id', req.id)
			.single();
		if (updatedOrderRes.error) {
			toastStore.show('Error fetching updated order', 'error');
			return;
		}
		const updatedOrder = updatedOrderRes.data;

		quoteLoading = true;
		//update request_stage to 'quoted' && update "events"
		const updateQuote = await data.supabase_lt
			.from('printrequests')
			.update({
				request_stage: 'quoted',
				events: [
					...(updatedOrder?.events || []),
					{
						type: 'quoted',
						reason: quoteBreakdown,
						timestamp: new Date().toISOString(),
						by: 'maker',
						extra: { quote: quote }
					}
				]
			})
			.eq('id', updatedOrder.id);
		if (updateQuote.error) {
			toastStore.show('Error updating quote', 'error');
			quoteLoading = false;
			return;
		}
		//send chat message of type 'quote'
		const chatInsert = await data.supabase_lt.from('Chat').insert([
			{
				sender_id: data.session?.data?.user?.id ?? '',
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
		invalidate('3dp-portal:printrequest');
		toastStore.show('Quote sent', 'success');
		quoteLoading = false;
		quoteDialogOpen = false;
	}

	async function onCancelCancel(e: MouseEvent) {
		e.preventDefault();
		cancelDialogOpen = false;
		cancelReason = '';
	}

	async function onConfirmCancel(e: MouseEvent) {
		e.preventDefault();
		if (!req.id || !data.session?.data?.user?.id || !cancelReason.trim()) return;
		const prevSelectedId = req.id;
		//repull the order data
		const updatedOrder = await data.supabase_lt
			.from('printrequests')
			.select('*')
			.eq('id', req.id)
			.single();
		if (!updatedOrder.data) return;
		// 1. Send chat message of type 'action'
		await data.supabase_lt.from('Chat').insert([
			{
				sender_id: data.session.data.user.id,
				recipient_id: updatedOrder.data.user_id ?? '',
				message: JSON.stringify({ action: 'cancelled', reason: cancelReason }),
				relationship_id: updatedOrder.data.id,
				message_type: 'action',
				status: 'sent'
			}
		]);
		// 2. Update print request's request_stage
		await data.supabase_lt
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
			.eq('id', updatedOrder.data.id);
		if (updatedOrder.error) {
			console.error('Error updating order', updatedOrder.error);
			return;
		}
		// 3. Close dialog and clear reason
		cancelDialogOpen = false;
		cancelReason = '';
		// 4. Refresh page
		invalidate('3dp-portal:printrequest');
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
			case 'shipped':
				return { msg: 'Order is shipped. No further action needed. This order will be closed when user marks it delivered or in 21 days, whichever comes first.', turn: 'user' };
			case 'in dispute':
				return { msg: 'Order is in dispute. Await resolution.', turn: 'SC Team' };
			case 'completed':
				return { msg: 'Order is completed.', turn: 'closed' };
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

	$effect(() => {
		(async () => {
			if (!data.session?.data?.user?.id) return;
			const { data: unread, error } = await data.supabase_lt
				.from('Chat')
				.select('chat_id')
				.eq('relationship_id', req.id)
				.eq('recipient_id', data.session.data.user.id)
				.eq('status', 'sent');
			if (error) return;
			unreadCount = unread.length;
		})();
	});

	$effect(() => {
		if (messageBoardOpen) {
			unreadCount = 0;
		}
	});

	onMount(() => {
		//track unread counts by subscribing to the chat channel
		if (!data.session?.data?.user?.id) return;
		const chatSubscription = data.supabase_lt
			.channel('realtime-chat-global')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'Chat',
					filter: `recipient_id=eq.${data.session.data.user.id}`
				},
				(payload) => {
					if (payload.new.message_type == 'quote' || payload.new.message_type == 'action') {
						//update quote & event history
						invalidate('3dp-portal:printrequest');
					}
					//update unread count
					unreadCount = (unreadCount || 0) + 1;
				}
			)
			.subscribe();
		return () => {
			data.supabase_lt.removeChannel(chatSubscription);
		};
	});
</script>

<div class="p-2 sm:p-4 max-w-3xl mx-auto h-full flex flex-col">
	<button
		onclick={() => goto('/3dp-portal/maker#orderManagement')}
		class="mb-4 text-accent text-sm font-medium flex items-center gap-1"
		><span>&larr;</span> Back</button>
	{#if !req}
		<div class="text-red-400 text-center py-12">Print request not found.</div>
	{:else}
		<div
			class="bg-black/60 rounded-lg p-4 flex flex-col items-start shadow-glow-subtle border border-accent/10 cursor-pointer select-none">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="flex flex-col items-start justify-between w-full">
				<div class="font-semibold text-white text-lg truncate">
					{modelName ?? 'Model'}
				</div>
				<div class="text-xs text-gray-400">{new Date(req.created_at).toLocaleString()}</div>
			</div>
		</div>
		<!-- Model details header -->
		<div class="flex flex-col h-full mt-4 w-full">
			<div class="text-sm text-gray-400 font-semibold">Model Details</div>
			<div class="flex flex-wrap gap-x-2 mt-2">
				<div
					class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex gap-2 items-center text-sm">
					<div>Model color:</div>
					<div class="w-5 h-5 rounded-sm" style={`background-color:${req.model_data.color}`}></div>
				</div>
				<div
					class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex gap-2 items-center text-sm">
					<div>Material:</div>
					<div>{req.model_data.material}</div>
				</div>
				<div
					class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex gap-2 items-center text-sm">
					<div>Quality:</div>
					<div>{req.model_data.quality}</div>
				</div>
				<div
					class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex gap-2 items-center text-sm">
					<div>Scale:</div>
					<div>{req.model_data.scale}x</div>
				</div>
				<div
					class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex gap-2 items-center text-sm">
					<div>Infill:</div>
					<div>{req.model_data.infill}%</div>
				</div>
				<div
					class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex gap-2 items-center text-sm">
					<div>Walls:</div>
					<div>{req.model_data.walls}</div>
				</div>
			</div>
		</div>
		<!-- Stage details header-->
		<div class="flex flex-col h-full mt-4 w-full">
			<div class="text-sm text-gray-400 font-semibold">Stage Details</div>
			<div class="flex flex-col mt-2">
				<div
					class={`mb-2 px-4 py-2 rounded-lg border w-fit flex gap-2 items-center text-sm font-semibold transition-all duration-200 ${STAGE_COLORS[String(req.request_stage)] || STAGE_COLORS.default}`}>
					<span class="capitalize">{req.request_stage}</span>
				</div>
			</div>
			<!-- show the stage description -->
			<div class="text-sm text-gray-400 flex flex-wrap items-center gap-x-2 mt-1">
				<!-- show the stage turn -->
				{#if req.request_stage}
					{@const turn = getStageExplanation(req.request_stage, '').turn}
					<div class="flex flex-col gap-1">
						<span class="text-xs w-fit {getTurn(turn).color} rounded-full px-2 py-1"
							>{getTurn(turn).msg}</span>
					</div>
				{/if}
				<span>{getStageExplanation(req.request_stage, '').msg}</span>
			</div>
		</div>

		<!-- Actions header -->
		<div class="flex flex-col h-full mt-4 w-full">
			<div class="text-sm text-gray-400 font-semibold">Actions</div>
			<!-- chat button that opens drawer with message board-->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
				<button
					class="relative bg-accent/10 hover:bg-accent/20 text-accent px-2 py-2 rounded-lg transition-all duration-200 disabled:opacity-60 flex justify-center items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-accent/20 hover:border-accent/40"
					onclick={() => (messageBoardOpen = true)}>
					<Icon icon="mdi:message" class="w-5 h-5" />
					<span class="font-medium text-sm">Message</span>
					{#if unreadCount > 0}
						<span
							class="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
							{unreadCount}
						</span>
					{/if}
				</button>
				{#if req.request_stage !== 'cancelled'}
					<button
						class="bg-accent/10 hover:bg-accent/20 text-accent px-2 py-2 rounded-lg transition-all duration-200 disabled:opacity-60 flex items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-accent/20 hover:border-accent/40 flex-col"
						onclick={(e) => {
							e.stopPropagation();
							downloadModel();
						}}
						disabled={downloading}>
						<div class="flex">
							<Icon icon="mdi:download" class="w-5 h-5" />
							<span class="font-medium text-sm"
								>{downloading
									? downloadProgress > 0
										? `Downloading... ${downloadProgress}%`
										: 'Downloading...'
									: 'Download Model'}</span>
						</div>
						{#if downloading && downloadProgress > 0}
							<div class="w-full bg-gray-700 rounded h-2">
								<div
									class="bg-accent h-2 rounded transition-all duration-200"
									style={`width: ${downloadProgress}%`}>
								</div>
							</div>
						{/if}
					</button>
				{/if}
				<!-- other actions -->
				{#if req.request_stage === 'requested'}
					<button
						class="bg-blue-400/10 hover:bg-blue-500/20 text-blue-300 px-2 py-2 justify-center rounded-lg transition-all duration-200 disabled:opacity-60 flex items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-blue-400/20 hover:border-blue-400/40"
						onclick={quoteOrder}>
						<Icon icon="mdi:currency-inr" class="w-5 h-5" />
						<span class="font-medium text-sm">Quote</span>
					</button>
				{:else if req.request_stage === 'quoted'}
					<button
						class="bg-blue-400/10 hover:bg-blue-500/20 text-blue-300 px-2 py-2 justify-center rounded-lg transition-all duration-200 disabled:opacity-60 flex items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-blue-400/20 hover:border-blue-400/40"
						onclick={quoteOrder}>
						<Icon icon="mdi:currency-inr" class="w-5 h-5" />
						<span class="font-medium text-sm">Re-Quote</span>
					</button>
				{:else if req.request_stage === 'paid'}
					<button
						class="bg-green-400/10 hover:bg-green-500/20 text-green-300 px-2 py-2 justify-center rounded-lg transition-all duration-200 disabled:opacity-60 flex items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-green-400/20 hover:border-green-400/40"
						onclick={onOpenShippedDialog}>
						<Icon icon="mdi:truck-delivery" class="w-5 h-5" />
						<span class="font-medium text-sm">Mark as Shipped</span>
					</button>
				{/if}
				<!-- help button that redirects to discord#help channel-->
				<a
					href="https://discord.gg/k6CC6GTR4g"
					class=" bg-yellow-400/10 hover:bg-yellow-500/20 text-yellow-300 justify-center px-2 py-2 rounded-lg transition-all duration-200 disabled:opacity-60 flex items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-yellow-400/20 hover:border-yellow-400/40"
					target="_blank"
					rel="noopener noreferrer">
					<Icon icon="ph:discord-logo-duotone" class="w-5 h-5" />
					<span class="font-medium text-sm">Help</span>
				</a>
				<!-- if the current stage is requested, show a button to cancel the request-->
				{#if req.request_stage === 'requested' || req.request_stage === 'quoted'}
					<button
						class="bg-red-400/10 hover:bg-red-500/20 text-red-300 px-2 py-2 justify-center rounded-lg transition-all duration-200 disabled:opacity-60 flex items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-red-400/20 hover:border-red-400/40"
						onclick={() => (cancelDialogOpen = true)}>
						<Icon icon="mdi:cancel" class="w-5 h-5" />
						<span class="font-medium text-sm">Cancel</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Event history header-->
		{#if sortedEvents && sortedEvents.length > 0}
		<div class="flex flex-col h-full mt-4 w-full">
			<div class="text-sm text-gray-400 font-semibold mb-2">Event history</div>
			<div class="flex flex-col gap-2">
				{#each sortedEvents as event}
					<div class="bg-black/10 px-4 py-2 rounded-lg border border-accent/10 text-sm {event.type === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-400/20' : ''} {event.type == 'paid' ? 'bg-green-500/10 text-green-400 border-green-400/20' : ''}">
						<div class="flex items-center justify-between text-white/80">
							<span class="font-medium"
								>Event : <span class="capitalize">{event.type}</span></span>
							<span class="text-gray-400 text-xs"
								>{new Date(event.timestamp).toLocaleString(undefined, {
									hour: '2-digit',
									minute: '2-digit',
									year: 'numeric',
									month: 'short',
									day: 'numeric'
								})}</span>
						</div>
						{#if event.reason}
							<div class="text-gray-400 mt-1 text-xs">Message : {event.reason}</div>
						{/if}
						{#if event.extra}
							{#if event.extra.quote}
								<div class="text-gray-400 mt-1 font-semibold">Quote : {event.extra.quote}₹</div>
							{/if}
							{#if event.extra.payment_id_a}
								<div class="text-gray-400 mt-1 font-semibold">Order ID : {event.extra.payment_id_a}</div>
							{/if}
							{#if event.extra.payment_id_b}
								<div class="text-gray-400 mt-1 font-semibold">Payment ID : {event.extra.payment_id_b}</div>
							{/if}
							{#if event.extra.amount}
								<div class="text-gray-400 mt-1 font-semibold">Amount : {(event.extra.amount/100).toFixed(2)}₹</div>
							{/if}
						{/if}
						<div class="text-accent/80 text-xs mt-1">
							by <span class="capitalize">{event.by == 'user' ? 'user' : 'you'}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
		{:else}
			<div class="flex flex-col h-full mt-4 w-full">
				<div class="text-sm text-gray-400 font-semibold mb-2">Event history</div>
				<div class="text-gray-400 text-start py-2 text-sm italic opacity-60 text-wrap">
					So empty.... <br />If any notable events (quotes,cancellations,payments,etc) happen,<br />
					they will be shown here.
				</div>
			</div>
		{/if}
	{/if}
</div>

{#if messageBoardOpen}
	<Drawer.Root bind:open={messageBoardOpen}>
		<Drawer.Trigger style="display:none" />
		<Drawer.Content class="max-w-3xl mx-auto h-[100vh] sm:h-[80vh] transition-all duration-200">
			<MessageBoard
				orderId={req.id}
				supabase_lt={data.supabase_lt}
				session={data.session}
				receiverId={req.user_id ?? ''}
				disabled={req.request_stage === 'cancelled' || req.request_stage === 'completed'} />
		</Drawer.Content>
	</Drawer.Root>
{/if}

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

<Dialog.Root bind:open={quoteDialogOpen}>
	<Dialog.Content class="z-[1050]">
		<Dialog.Header>
			<Dialog.Title>Quote Order</Dialog.Title>
			<Dialog.Description>Please provide a quote for the order.</Dialog.Description>
		</Dialog.Header>
		<Textarea
			disabled={quoteLoading}
			bind:value={quoteBreakdown}
			class="w-full mt-4"
			placeholder="Enter quote breakdown (optional)" />
		<!-- quote inr floating input-->
		<div class="flex flex-col gap-2">
			<span class="text-xs text-gray-400">Quote - Final Price (₹)</span>
			<div class="flex flex-row gap-2 items-center">
				<span class="text-sm text-gray-400">₹</span>
				<input
					disabled={quoteLoading}
					type="number"
					bind:value={quote}
					class="w-full rounded-md p-2 bg-accent/5 border border-accent/10 text-sm text-gray-400 placeholder:text-gray-400 placeholder:opacity-50"
					placeholder="Enter price like : 249.99" />
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

<Dialog.Root bind:open={shippedDialogOpen}>
	<Dialog.Content class="z-[1050]">
		<Dialog.Header>
			<Dialog.Title>Mark as Shipped</Dialog.Title>
			<Dialog.Description>
				Please provide the shipping details. <span class="text-yellow-400">Either Tracking ID or Tracking Link is required.</span>
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-3 mt-4">
			<label class="text-sm text-gray-300 font-medium">Courier Name<span class="text-red-400">*</span></label>
			<input
				type="text"
				bind:value={courierName}
				class="w-full rounded-md p-2 bg-accent/5 border border-accent/10 text-sm text-gray-400 placeholder:text-gray-400 placeholder:opacity-50"
				placeholder="e.g. Bluedart, Delhivery, etc."
				disabled={shippedLoading}
			/>
			<label class="text-sm text-gray-300 font-medium">Tracking ID</label>
			<input
				type="text"
				bind:value={trackingId}
				class="w-full rounded-md p-2 bg-accent/5 border border-accent/10 text-sm text-gray-400 placeholder:text-gray-400 placeholder:opacity-50"
				placeholder="e.g. 1234567890"
				disabled={shippedLoading}
			/>
			<label class="text-sm text-gray-300 font-medium">Tracking Link</label>
			<input
				type="url"
				bind:value={trackingLink}
				class="w-full rounded-md p-2 bg-accent/5 border border-accent/10 text-sm text-gray-400 placeholder:text-gray-400 placeholder:opacity-50"
				placeholder="e.g. https://courier.com/track/123456"
				disabled={shippedLoading}
			/>
			{#if shippedError}
				<div class="text-red-400 text-xs mt-1">{shippedError}</div>
			{/if}
		</div>
		<Dialog.Footer class="flex justify-end gap-3 mt-6">
			<button
				class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
				onclick={onCancelShipped}
				disabled={shippedLoading}
			>Cancel</button>
			<button
				class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				onclick={onConfirmShipped}
				disabled={shippedLoading}
			>
				<Icon icon="ph:paper-plane-right-duotone" class="text-base" />
				Mark as Shipped
				{#if shippedLoading}
					<Icon icon="line-md:loading-twotone-loop" class="text-base animate-spin" />
				{/if}
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
