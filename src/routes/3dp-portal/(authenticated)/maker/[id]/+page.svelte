<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import MessageBoard from '$lib/components/maker/MessageBoard.svelte';
	import { performPrintRequestAction } from '$lib/client/portalApi';
	import { toastStore } from '$lib/client/toastStore';
	import { getModelDownloadUrl, triggerSignedUrlDownload } from '$lib/client/printFilesApi';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { goto, invalidate } from '$app/navigation';
	import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';
	import { PortalCard, PortalSectionLabel } from '$lib/components/portal';
	import { MetaChip, ScButton, TagBadge } from '$lib/components/sc';
	import { cn } from '$lib/utils';
	import { asPrintRequest, getPrintRequestDisplayName } from '$lib/types/printRequest';
	import { formatPrintEventAmountInr } from '$lib/types/printEventMoney';

	let { data } = $props();

	function supabase() {
		return requireBrowserSupabase(data.supabase);
	}

	let req = $state(asPrintRequest(data.printRequest));
	$effect(() => {
		req = asPrintRequest(data.printRequest);
	});

	const sortedEvents = $derived(
		req?.events
			? [...req.events]
					.filter((event) => event.type !== 'order_created')
					.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			: []
	);
	let downloading = $state(false);
	let messageBoardOpen = $state(false);
	let cancelDialogOpen = $state(false);
	let cancelReason = $state('');
	let downloadProgress = $state(0);
	let unreadCount = $state(0);

	const displayModelName = $derived.by(() =>
		getPrintRequestDisplayName(req?.model, req?.model_metadata)
	);

	const STAGE_STYLES: Record<string, string> = {
		cancelled: 'border-destructive/30 bg-destructive/5 text-destructive',
		requested: 'border-border bg-muted/40 text-foreground',
		quoted: 'border-border bg-muted/40 text-foreground',
		actionable: 'border-foreground/20 bg-foreground/5 text-foreground',
		paid: 'border-border bg-muted text-foreground',
		paid_externally: 'border-border bg-muted text-foreground',
		shipped: 'border-border bg-muted/40 text-foreground',
		completed: 'border-border bg-muted/30 text-muted-foreground',
		'in dispute': 'border-warning/30 bg-warning/5 text-warning',
		default: 'border-border bg-muted/40 text-muted-foreground'
	};

	function stageStyle(stage: string | null) {
		return STAGE_STYLES[String(stage)] ?? STAGE_STYLES.default;
	}

	const stageInfo = $derived.by(() => {
		if (!req?.request_stage) return { msg: 'No stage information.', turn: 'maker' };
		return getStageExplanation(req.request_stage, data.username);
	});

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
			shippedError = 'Courier name is required.';
			return;
		}
		if (!trackingId.trim() && !trackingLink.trim()) {
			shippedError = 'Please provide either a tracking ID or tracking link.';
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
			} catch {
				return false;
			}
		}
		if (!req || !req.id || !data.session?.data?.user?.id) {
			shippedError = 'Order or session missing.';
			return;
		}
		shippedLoading = true;
		const result = await performPrintRequestAction(fetch, req.id, {
			action: 'shipped',
			payload: {
				courier: courierName.trim(),
				tracking_id: trackingId.trim() || undefined,
				tracking_link: trackingLink.trim() || undefined
			}
		});
		if (!result.ok) {
			shippedError = result.error.message;
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
		toastStore.show('Order marked as shipped', 'success');
	}

	async function downloadModel() {
		if (!req?.model || !req?.id) return;
		const { data: userRes, error: userErr } = await supabase().auth.getSession();
		if (userErr || !userRes?.session?.access_token) {
			toastStore.show('You must be logged in to download the model', 'error');
			return;
		}
		downloading = true;
		downloadProgress = 0;
		try {
			const result = await getModelDownloadUrl(fetch, req.id);
			if (!result.ok) {
				toastStore.show(result.error.message, 'error');
				downloading = false;
				downloadProgress = 0;
				return;
			}
			triggerSignedUrlDownload(result.data.url, displayModelName, {
				onProgress: (percent) => {
					downloadProgress = percent;
				},
				onComplete: () => {
					downloading = false;
					downloadProgress = 0;
				},
				onError: (message) => toastStore.show(message, 'error')
			});
		} catch {
			toastStore.show('Error downloading model', 'error');
			downloading = false;
			downloadProgress = 0;
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
		if (!req || !req.id) {
			toastStore.show('No valid order selected', 'error');
			return;
		}
		const amount = Number(quote);
		if (!Number.isInteger(amount) || amount <= 0) {
			toastStore.show('Quote must be a positive whole number in rupees', 'error');
			return;
		}
		quoteLoading = true;
		const result = await performPrintRequestAction(fetch, req.id, {
			action: 'quote',
			payload: {
				amount,
				reason: quoteBreakdown || undefined
			}
		});
		if (!result.ok) {
			toastStore.show(result.error.message, 'error');
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
		if (!req || !req.id || !data.session?.data?.user?.id || !cancelReason.trim()) return;
		const result = await performPrintRequestAction(fetch, req.id, {
			action: 'decline',
			payload: { reason: cancelReason.trim() }
		});
		if (!result.ok) {
			toastStore.show(result.error.message, 'error');
			return;
		}
		cancelDialogOpen = false;
		cancelReason = '';
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
					msg: `${username ?? 'The customer'} has requested a print. Please review and provide a quote.`,
					turn: 'maker'
				};
			case 'quoted':
				return { msg: 'Quote has been provided. Awaiting customer action.', turn: 'user' };
			case 'actionable':
				return { msg: 'Order is actionable. Proceed with the next steps.', turn: 'user' };
			case 'paid':
				return { msg: 'Order has been paid. Begin processing the order.', turn: 'maker' };
			case 'paid_externally':
				return { msg: 'Order was paid externally. Confirm and proceed.', turn: 'maker' };
			case 'shipped':
				return {
					msg: 'Order is shipped. No further action needed. This order will close when the customer marks it delivered or in 21 days, whichever comes first.',
					turn: 'user'
				};
			case 'in dispute':
				return { msg: 'Order is in dispute. Await resolution from the SC team.', turn: 'SC Team' };
			case 'completed':
				return { msg: 'Order is completed.', turn: 'closed' };
			default:
				return { msg: 'Unknown stage.', turn: 'SC Team' };
		}
	}

	function getTurn(turn: string): { msg: string; style: string } {
		switch (turn) {
			case 'maker':
				return { msg: 'your_turn', style: 'border-border bg-foreground/5 text-foreground' };
			case 'user':
				return { msg: 'customer_turn', style: 'border-border bg-muted text-muted-foreground' };
			case 'SC Team':
				return { msg: 'sc_review_pending', style: 'border-warning/30 bg-warning/5 text-warning' };
			case 'closed':
				return { msg: 'closed', style: 'border-border bg-muted/30 text-muted-foreground' };
			default:
				return { msg: 'unknown', style: 'border-border bg-muted/30 text-muted-foreground' };
		}
	}

	$effect(() => {
		(async () => {
			const order = req;
			if (!order || !data.session?.data?.user?.id) return;
			const { data: unread, error } = await supabase()
				.from('Chat')
				.select('chat_id')
				.eq('relationship_id', order.id)
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

	$effect(() => {
		const userId = data.session?.data?.user?.id;
		const orderId = req?.id;
		if (!userId || !orderId) return;

		const chatSubscription = supabase()
			.channel(`maker-order-chat:${userId}:${orderId}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'Chat',
					filter: `recipient_id=eq.${userId}`
				},
				(payload) => {
					if (payload.new.message_type == 'quote' || payload.new.message_type == 'action') {
						invalidate('3dp-portal:printrequest');
					}
					unreadCount = (unreadCount || 0) + 1;
				}
			)
			.subscribe();
		return () => {
			supabase().removeChannel(chatSubscription);
		};
	});
</script>

<div class="mx-auto max-w-7xl px-4 pb-16">
	<button
		type="button"
		onclick={() => goto('/3dp-portal/maker#orderManagement')}
		class="mb-6 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
		<Icon icon={F.arrowLeft} class="size-3.5" />
		back_to_orders
	</button>

	{#if !req}
		<PortalCard class="py-16 text-center">
			<p class="text-sm text-destructive">Print request not found.</p>
		</PortalCard>
	{:else}
		<header class="mb-8 border-b border-border pb-8">
			<TagBadge label="print_request" class="mb-3" />
			<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">{displayModelName}</h1>
			<p class="mt-2 font-mono text-xs text-muted-foreground">
				{new Date(req.created_at).toLocaleString()}
			</p>
		</header>

		<div class="grid gap-4">
			<PortalCard>
				<PortalSectionLabel label="customer" />
				<div class="mt-2 space-y-1">
					<p class="font-medium text-foreground">{data.username ?? 'Customer'}</p>
				</div>
			</PortalCard>

			<PortalCard>
				<PortalSectionLabel label="model_details" />
				<div class="mt-2 flex flex-wrap gap-1.5">
					<MetaChip>
						<span class="inline-flex items-center gap-1.5">
							color:
							<span
								class="inline-block size-3 rounded-sm border border-border"
								style={`background-color:${req.model_data.color}`}></span>
						</span>
					</MetaChip>
					<MetaChip>material: {req.model_data.material}</MetaChip>
					<MetaChip tone="muted">quality: {req.model_data.quality}</MetaChip>
					<MetaChip tone="muted">scale: {req.model_data.scale}x</MetaChip>
					<MetaChip tone="muted">infill: {req.model_data.infill}%</MetaChip>
					<MetaChip tone="muted">walls: {req.model_data.walls}</MetaChip>
				</div>
			</PortalCard>

			<PortalCard>
				<PortalSectionLabel label="stage" />
				<div class="mt-2 space-y-2">
					<div class="flex flex-wrap items-center gap-2">
						<span
							class={cn(
								'inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-xs capitalize',
								stageStyle(req.request_stage)
							)}>
							{req.request_stage?.replaceAll('_', ' ') ?? 'pending'}
						</span>
						{#if req.request_stage}
							{@const turn = getTurn(stageInfo.turn)}
							<span
								class={cn(
									'inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px]',
									turn.style
								)}>
								{turn.msg}
							</span>
						{/if}
					</div>
					<p class="text-sm leading-relaxed text-muted-foreground">{stageInfo.msg}</p>
				</div>
			</PortalCard>

			<PortalCard>
				<PortalSectionLabel label="actions" />
				<div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
					<button
						type="button"
						class="relative inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
						onclick={() => (messageBoardOpen = true)}>
						<Icon icon={F.chat} class="size-4" />
						Message
						{#if unreadCount > 0}
							<span
								class="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-destructive/30 bg-destructive px-1.5 py-0.5 font-mono text-[10px] text-destructive-foreground">
								{unreadCount}
							</span>
						{/if}
					</button>

					{#if req.request_stage !== 'cancelled'}
						<button
							type="button"
							class="inline-flex flex-col items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
							onclick={(e) => {
								e.stopPropagation();
								downloadModel();
							}}
							disabled={downloading}>
							<span class="inline-flex items-center gap-2">
								<Icon icon={F.download} class="size-4" />
								{downloading
									? downloadProgress > 0
										? `Downloading… ${downloadProgress}%`
										: 'Downloading…'
									: 'Download model'}
							</span>
							{#if downloading && downloadProgress > 0}
								<div class="h-1 w-full overflow-hidden rounded-full bg-border">
									<div
										class="h-full rounded-full bg-foreground transition-all duration-200"
										style={`width: ${downloadProgress}%`}>
									</div>
								</div>
							{/if}
						</button>
					{/if}

					{#if req.request_stage === 'requested'}
						<ScButton class="justify-center" onclick={quoteOrder}>
							<Icon icon={F.money} class="mr-1.5 size-4" />
							Send quote
						</ScButton>
					{:else if req.request_stage === 'quoted'}
						<ScButton variant="secondary" class="justify-center" onclick={quoteOrder}>
							<Icon icon={F.money} class="mr-1.5 size-4" />
							Re-quote
						</ScButton>
					{:else if req.request_stage === 'paid'}
						<ScButton class="justify-center" onclick={onOpenShippedDialog}>
							<Icon icon={F.truck} class="mr-1.5 size-4" />
							Mark as shipped
						</ScButton>
					{/if}

					<ScButton
						variant="discord"
						href="https://discord.gg/k6CC6GTR4g"
						target="_blank"
						rel="noopener noreferrer"
						class="justify-center">
						Help on Discord
					</ScButton>

					{#if req.request_stage === 'requested' || req.request_stage === 'quoted'}
						<ScButton
							variant="secondary"
							class="justify-center border-destructive/30 text-destructive hover:bg-destructive/5"
							onclick={() => (cancelDialogOpen = true)}>
							Decline request
						</ScButton>
					{/if}
				</div>
			</PortalCard>

			<PortalCard>
				<PortalSectionLabel label="event_history" />
				{#if sortedEvents && sortedEvents.length > 0}
					<div class="mt-3 flex flex-col gap-2">
						{#each sortedEvents as event (event.timestamp + event.type)}
							<div
								class={cn(
									'rounded-md border px-4 py-3 text-sm',
									event.type === 'cancelled'
										? 'border-destructive/30 bg-destructive/5'
										: event.type === 'paid'
											? 'border-border bg-muted/30'
											: 'border-border bg-card'
								)}>
								<div class="flex items-center justify-between gap-3">
									<span class="font-mono text-xs text-foreground capitalize">
										{event.type.replaceAll('_', ' ')}
									</span>
									<span class="font-mono text-[10px] text-muted-foreground">
										{new Date(event.timestamp).toLocaleString(undefined, {
											hour: '2-digit',
											minute: '2-digit',
											year: 'numeric',
											month: 'short',
											day: 'numeric'
										})}
									</span>
								</div>
								{#if event.reason}
									<p class="mt-1 text-xs text-muted-foreground">{event.reason}</p>
								{/if}
								{#if event.extra}
									{#if event.extra.quote}
										<p class="mt-1 font-mono text-xs text-foreground">
											quote: {event.extra.quote}₹
										</p>
									{/if}
									{#if event.extra.payment_id_a}
										<p class="mt-1 font-mono text-xs text-muted-foreground">
											order_id: {event.extra.payment_id_a}
										</p>
									{/if}
									{#if event.extra.payment_id_b}
										<p class="mt-1 font-mono text-xs text-muted-foreground">
											payment_id: {event.extra.payment_id_b}
										</p>
									{/if}
									{#if formatPrintEventAmountInr(event.extra)}
										<p class="mt-1 font-mono text-xs text-muted-foreground">
											amount: {formatPrintEventAmountInr(event.extra)}₹
										</p>
									{/if}
								{/if}
								<p class="mt-1 font-mono text-[10px] text-muted-foreground">
									by {event.by === 'user' ? 'customer' : 'you'}
								</p>
							</div>
						{/each}
					</div>
				{:else}
					<p class="mt-3 text-sm italic text-muted-foreground">
						No notable events yet. Quotes, cancellations, and payments will appear here.
					</p>
				{/if}
			</PortalCard>
		</div>
	{/if}
</div>

{#if messageBoardOpen && req}
	<Drawer.Root bind:open={messageBoardOpen}>
		<Drawer.Trigger class="hidden" />
		<Drawer.Content
			class="mx-auto flex h-[100vh] max-w-3xl flex-col border-border bg-background sm:h-[80vh]">
			<MessageBoard
				orderId={req.id}
				supabase={supabase()}
				session={data.session}
				receiverId={req.user_id ?? ''}
				disabled={req.request_stage === 'cancelled' || req.request_stage === 'completed'} />
		</Drawer.Content>
	</Drawer.Root>
{/if}

<Dialog.Root bind:open={cancelDialogOpen}>
	<Dialog.Content class="z-[1050] border-border bg-card">
		<Dialog.Header>
			<Dialog.Title>Decline request</Dialog.Title>
			<Dialog.Description>
				Please provide a reason for declining. This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Textarea bind:value={cancelReason} class="mt-4 w-full" placeholder="Enter reason…" />
		<Dialog.Footer class="gap-2">
			<ScButton variant="secondary" onclick={onCancelCancel}>Cancel</ScButton>
			<button
				type="button"
				class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
				onclick={onConfirmCancel}
				disabled={!cancelReason.trim()}>
				Confirm
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={quoteDialogOpen}>
	<Dialog.Content class="z-[1050] border-border bg-card">
		<Dialog.Header>
			<Dialog.Title>Quote order</Dialog.Title>
			<Dialog.Description>Provide a quote for this print request.</Dialog.Description>
		</Dialog.Header>
		<Textarea
			disabled={quoteLoading}
			bind:value={quoteBreakdown}
			class="mt-4 w-full"
			placeholder="Quote breakdown (optional)…" />
		<div class="mt-4 flex flex-col gap-2">
			<label for="quote-amount" class="font-mono text-xs text-muted-foreground">
				final_price_inr
			</label>
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">₹</span>
				<input
					id="quote-amount"
					disabled={quoteLoading}
					type="number"
					bind:value={quote}
					class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
					placeholder="e.g. 249" />
			</div>
		</div>
		<Dialog.Footer class="mt-6 gap-2">
			<ScButton variant="secondary" onclick={() => (quoteDialogOpen = false)}>Cancel</ScButton>
			<ScButton onclick={onSendQuote} disabled={!quote || quoteLoading}>
				{#if !quoteLoading}
					<Icon icon={F.send} class="mr-1.5 size-4" />
				{/if}
				{quoteLoading ? 'Sending…' : 'Send quote'}
			</ScButton>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={shippedDialogOpen}>
	<Dialog.Content class="z-[1050] border-border bg-card">
		<Dialog.Header>
			<Dialog.Title>Mark as shipped</Dialog.Title>
			<Dialog.Description>
				Provide shipping details. Either a tracking ID or tracking link is required.
			</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4 flex flex-col gap-3">
			<div>
				<label for="courier-name" class="mb-1.5 block font-mono text-xs text-muted-foreground">
					courier_name <span class="text-destructive">*</span>
				</label>
				<input
					id="courier-name"
					type="text"
					bind:value={courierName}
					class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
					placeholder="e.g. Bluedart, Delhivery"
					disabled={shippedLoading} />
			</div>
			<div>
				<label for="tracking-id" class="mb-1.5 block font-mono text-xs text-muted-foreground">
					tracking_id
				</label>
				<input
					id="tracking-id"
					type="text"
					bind:value={trackingId}
					class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
					placeholder="e.g. 1234567890"
					disabled={shippedLoading} />
			</div>
			<div>
				<label for="tracking-link" class="mb-1.5 block font-mono text-xs text-muted-foreground">
					tracking_link
				</label>
				<input
					id="tracking-link"
					type="url"
					bind:value={trackingLink}
					class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
					placeholder="https://courier.com/track/123456"
					disabled={shippedLoading} />
			</div>
			{#if shippedError}
				<p class="text-xs text-destructive">{shippedError}</p>
			{/if}
		</div>
		<Dialog.Footer class="mt-6 gap-2">
			<ScButton variant="secondary" onclick={onCancelShipped} disabled={shippedLoading}>
				Cancel
			</ScButton>
			<ScButton onclick={onConfirmShipped} disabled={shippedLoading}>
				{#if !shippedLoading}
					<Icon icon={F.truck} class="mr-1.5 size-4" />
				{/if}
				{shippedLoading ? 'Saving…' : 'Mark as shipped'}
			</ScButton>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
