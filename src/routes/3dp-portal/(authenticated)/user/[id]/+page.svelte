<script lang="ts">
	import MessageBoard from '$lib/components/maker/MessageBoard.svelte';
	import Icon from '@iconify/svelte';
	import { page } from '$app/state';
	import { elasticInOut, expoInOut } from 'svelte/easing';
	import { toastStore } from '$lib/client/toastStore';
	import { fade, slide } from 'svelte/transition';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { goto, invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	let { data } = $props();

	let req = $state(data.printRequest);
	let sortedEvents = $derived(
		req.events
			? [...req.events].sort(
					(a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
				)
			: []
	);
	$effect(() => {
		req = data.printRequest;
	});

	const maker = data.maker;
	let downloading = $state(false);
	let detailsOpen = $state(true);
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
		requested: 'You have requested a quote for a 3D print. Please wait for the maker to quote you.',
		quoted: 'A maker has quoted you. Please review the quote and accept or reject it.',
		actionable: 'Maker has requested an action from you. Please take action on the request.',
		paid: 'You have paid for the 3D print. Please wait for the maker to complete the print.',
		paid_externally:
			'You have paid for the 3D print externally. Please wait for the maker to complete the print.',
		completed:
			'You have acknowledged the receipt of the 3D print. Please leave a review for the maker.',
		'in dispute': 'The request is in dispute. Our Team will intervene to resolve the dispute.',
		default: 'The request is in default.'
	};

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

	async function onCancelCancel(e: MouseEvent) {
		e.preventDefault();
		cancelDialogOpen = false;
		cancelReason = '';
	}

	async function onConfirmCancel(e: MouseEvent) {
		e.preventDefault();
		if (!req || !data.session?.data?.user?.id || !cancelReason.trim()) return;
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
				recipient_id: req.creator_id ?? '',
				message: JSON.stringify({ action: 'cancelled', reason: cancelReason }),
				relationship_id: req.id,
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
						by: 'user'
					}
				]
			})
			.eq('id', req.id);
		if (updatedOrder.error) {
			console.error('Error updating order', updatedOrder.error);
			return;
		}
		// 3. Close dialog and clear reason
		cancelDialogOpen = false;
		cancelReason = '';
		// 4. Refresh page
		window.location.reload();
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
		onclick={() => goto('/3dp-portal/user')}
		class="mb-4 text-accent text-sm font-medium flex items-center gap-1"
		><span>&larr;</span> Back</button>
	{#if !req}
		<div class="text-red-400 text-center py-12">Print request not found.</div>
	{:else}
		<div
			class="bg-black/60 rounded-lg p-4 flex flex-col items-start shadow-glow-subtle border border-accent/10 cursor-pointer select-none">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="flex items-center justify-between w-full"
				onclick={() => (detailsOpen = !detailsOpen)}
				aria-label={detailsOpen ? 'Hide details' : 'Show details'}>
				<div class="font-semibold text-white text-lg truncate">
					{modelName ?? 'Model'}
				</div>

				<div class="flex">
					<Icon
						icon="mdi:chevron-down"
						class="w-5 h-5 ml-2 text-accent/80 transition:all {detailsOpen
							? 'rotate-180'
							: ''} duration-200 ease-in-out" />
				</div>
			</div>
			{#if detailsOpen}
				<div
					class="pt-2"
					in:slide={{ axis: 'y', duration: 400, easing: expoInOut }}
					out:slide={{ axis: 'y', duration: 400, easing: expoInOut }}>
					<div class="text-xs text-gray-400 mb-2">{new Date(req.created_at).toLocaleString()}</div>
					<div class="flex flex-wrap gap-2 text-xs text-white/80 mb-2">
						<span class="bg-accent/10 px-2 py-0.5 rounded"
							>Material: {req.model_data.material}</span>
						<span class="bg-accent/10 px-2 py-0.5 rounded">Quality: {req.model_data.quality}</span>
						<span class="bg-accent/10 px-2 py-0.5 rounded">Scale: {req.model_data.scale}x</span>
						<span class="bg-accent/10 px-2 py-0.5 rounded">Infill: {req.model_data.infill}%</span>
						<span class="bg-accent/10 px-2 py-0.5 rounded">Walls: {req.model_data.walls}</span>
					</div>
				</div>
			{/if}
		</div>
		<!-- Other details header -->
		<div class="flex flex-col h-full mt-4 w-full">
			<div class="text-sm text-gray-400 font-semibold">Other Details</div>
			<div class="flex flex-col mt-2">
				{#if maker}
					<div
						class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex flex-col text-sm">
						<span>Maker: <span class="font-semibold">{maker.name}</span></span>
						<span class="text-gray-400">({maker.email}, {maker.contact_number})</span>
					</div>
				{/if}
				<div class="flex gap-2">
					<div
						class="text-white/80 mb-2 bg-black/10 px-4 py-2 rounded-lg border border-accent/10 w-fit flex gap-2 items-center text-sm">
						<!-- show color in a rounded cube -->
						<div>Model color:</div>
						<div class="w-5 h-5 rounded-sm" style={`background-color:${req.model_data.color}`}>
						</div>
					</div>
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
			<div class="text-sm text-gray-400">
				{STAGE_DESCRIPTIONS[String(req.request_stage)] || 'No description available'}
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
				<!-- if the current stage is quoted, show a button to pay the quote-->
				{#if req.request_stage === 'quoted'}
					<button
						class="bg-emerald-400/10 hover:bg-emerald-500/20 text-emerald-300 px-2 py-2 justify-center rounded-lg transition-all duration-200 disabled:opacity-60 flex items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-emerald-400/20 hover:border-emerald-400/40">
						<span class="font-medium text-sm"
							>Pay {req.events
								.filter((e: any) => e.type === 'quoted')
								.sort(
									(a: any, b: any) =>
										new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
								)[0]?.extra.quote}₹</span>
					</button>
					<!-- reject quote button that opens a dialog to reject the quote
					<button
						class="bg-red-400/10 hover:bg-red-500/20 text-red-300 px-2 py-2 justify-center rounded-lg transition-all duration-200 disabled:opacity-60 flex items-center gap-2 shadow-glow-subtle hover:shadow-glow border border-red-400/20 hover:border-red-400/40"
						onclick={() => (rejectQuoteDialogOpen = true)}>
						<span class="font-medium text-sm">Reject Quote</span>
					</button> -->
				{/if}
			</div>
		</div>

		<!-- Event history header-->
		{#if sortedEvents && sortedEvents.length > 0}
			<div class="flex flex-col h-full mt-4 w-full">
				<div class="text-sm text-gray-400 font-semibold mb-2">Event history</div>
				<div class="flex flex-col gap-2">
					{#each sortedEvents as event}
						<div class="bg-black/10 px-4 py-2 rounded-lg border border-accent/10 text-sm">
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
								<div class="text-gray-400 mt-1 font-semibold">Quote : {event.extra.quote}₹</div>
							{/if}
							<div class="text-accent/80 text-xs mt-1">
								by <span class="capitalize">{event.by == 'user' ? 'you' : 'maker'}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="flex flex-col h-full mt-4 w-full">
			<div class="text-sm text-gray-400 font-semibold mb-2">Event history</div>
				<div class="text-gray-400 text-start py-2 text-sm italic opacity-60 text-wrap">So empty.... <br/>If any notable events (quotes,cancellations,payments,etc) happen,<br/> they will be shown here.</div>
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
				receiverId={req.creator_id ?? ''}
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
