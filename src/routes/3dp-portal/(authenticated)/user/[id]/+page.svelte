<script lang="ts">
	import MessageBoard from '$lib/components/maker/MessageBoard.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import CheckCircle from '@lucide/svelte/icons/circle-check';
	import Download from '@lucide/svelte/icons/download';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Star from '@lucide/svelte/icons/star';
	import { PUBLIC_RAZORPAY_ID } from '$env/static/public';
	import { performPrintRequestAction } from '$lib/client/portalApi';
	import { toastStore } from '$lib/client/toastStore';
	import { getModelDownloadUrl, triggerSignedUrlDownload } from '$lib/client/printFilesApi';
	import {
		confirmPrintPayment,
		createPrintPaymentOrder,
		failPrintPayment
	} from '$lib/client/printPaymentsApi';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { goto, invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import AddressInputSelector from '$lib/components/fundamental/AddressInputSelector.svelte';
	import { PortalCard, PortalSectionLabel } from '$lib/components/portal';
	import { MetaChip, ReviewCardSkeleton, ScButton, TagBadge } from '$lib/components/sc';
	import { newAddress, validateAddress, type Address } from '$lib/types/product';
	import { cn } from '$lib/utils';
	import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';
	import { asPrintRequest } from '$lib/types/printRequest';
	let { data } = $props();

	function supabase() {
		return requireBrowserSupabase(data.supabase_lt);
	}

	let req = $state(asPrintRequest(data.printRequest));
	$effect(() => {
		req = asPrintRequest(data.printRequest);
	});

	let sortedEvents = $derived(
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
	let validAddress = $state<Address>({});
	let addressValid: boolean = $state(false);
	if (data.session.data.user && data.addresses && data.addresses.length > 0) {
		const firstAddress = data.addresses[0];
		if (validateAddress(firstAddress) == null) {
			addressValid = true;
			validAddress = firstAddress;
		} else {
			addressValid = false;
			validAddress = newAddress();
		}
	} else {
		addressValid = false;
		validAddress = newAddress();
	}

	const displayModelName = $derived.by(() => {
		const parts = req?.model?.split('/').pop()?.split('.') ?? [];
		if (parts.length < 2) return 'Model';
		const nameParts = parts[parts.length - 2]?.split('_') ?? [];
		return `${nameParts[nameParts.length - 1] ?? 'model'}.${parts[parts.length - 1]}`;
	});

	const latestQuote = $derived(
		req?.events
			?.filter((e) => e.type === 'quoted')
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.extra
			?.quote
	);

	const latestQuoteAmount = $derived.by(() => {
		const quote = latestQuote;
		if (quote == null) return undefined;
		const amount = Number(quote);
		return Number.isFinite(amount) ? amount : undefined;
	});

	const maker = data.maker;

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

	function stageStyle(stage: string | null) {
		return STAGE_STYLES[String(stage)] ?? STAGE_STYLES.default;
	}

	const STAGE_DESCRIPTIONS: { [key: string]: string } = {
		cancelled: 'The request has been cancelled.',
		requested: 'You have requested a quote for a 3D print. Please wait for the maker to quote you.',
		quoted: 'A maker has quoted you. Please review the quote and accept or reject it.',
		actionable: 'Maker has requested an action from you. Please take action on the request.',
		shipped:
			'The maker has shipped the 3D print. Please wait for it to be delivered and then mark it as delivered. We kindly request you to leave a review for the maker after the delivery.',
		paid: 'You have paid for the 3D print. Please wait for the maker to complete the print.',
		paid_externally:
			'You have paid for the 3D print externally. Please wait for the maker to complete the print.',
		completed:
			'You have acknowledged the receipt of the 3D print. Please leave a review for the maker.',
		'in dispute': 'The request is in dispute. Our Team will intervene to resolve the dispute.',
		default: 'The request is in default.'
	};

	let payLoading = $state(false);

	async function payQuote() {
		if (payLoading) return;
		const order = req;
		if (!order?.model || latestQuoteAmount == null) return;
		payLoading = true;
		let addressValidity = validateAddress(validAddress);
		if (addressValidity) {
			highlightAddressSelector();
			toastStore.show(addressValidity, 'error');
			payLoading = false;
			return;
		}
		const orderResult = await createPrintPaymentOrder(fetch, order.id, validAddress);
		if (!orderResult.ok) {
			toastStore.show(orderResult.error.message, 'error');
			payLoading = false;
			return;
		}
		openRazorpayDialog(orderResult.data.razorpayOrderId, orderResult.data.amountPaise);
		payLoading = false;
	}

	async function openRazorpayDialog(order_id: string, amount: number) {
		try {
			var options = {
				key: PUBLIC_RAZORPAY_ID, // Enter the Key ID generated from the Dashboard
				amount: amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
				currency: 'INR',
				name: 'SelfCrafted',
				image:
					'https://pfeewicqoxkuwnbuxnoz.supabase.co/storage/v1/object/public/images/favicon.png',
				order_id: order_id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
				handler: async function (response: {
					razorpay_order_id: string;
					razorpay_payment_id: string;
					razorpay_signature: string;
				}) {
					if (!req) {
						console.error('Print request data became unavailable during payment processing.');
						return;
					}
					const confirmResult = await confirmPrintPayment(fetch, req.id, {
						razorpayOrderId: response.razorpay_order_id,
						razorpayPaymentId: response.razorpay_payment_id,
						razorpaySignature: response.razorpay_signature
					});
					if (!confirmResult.ok) {
						toastStore.show(confirmResult.error.message, 'error');
						return;
					}
					goto(`/summary/success/${req.id}/${response.razorpay_payment_id}`);
				},
				modal: {
					ondismiss: async function () {
						//remove order_created event from print request
						// await supabase().from('printrequests').update({
						// 	order_id: null,
						// 	events: data.printRequest.events.filter((event: any) => event.type !== 'order_created')
						// }).eq('id', req.id);
						invalidate('3dp-portal:printrequest');
						toastStore.show('Payment cancelled by User', 'warning');
						return;
					}
				},
				prefill: {},
				theme: {
					color: '#2084fe'
				}
			};
			// @ts-ignore - Razorpay is loaded from external script
			var rzp1 = new Razorpay(options);
			if (!rzp1) {
				alert('Issue with Payment Provider, try again');
				return;
			}
			// @ts-ignore - Razorpay is loaded from external script
			rzp1.open();
			// @ts-ignore - Razorpay is loaded from external script
			rzp1.on('payment.failed', function (response: unknown) {
				const failedResponse = response as {
					error?: { metadata?: { order_id?: string }; description?: string };
				};
				toastStore.show('Payment failed, please try again', 'error');
				// @ts-ignore - Razorpay is loaded from external script
				rzp1.close();
				const orderId = req?.id;
				const razorpayOrderId = failedResponse.error?.metadata?.order_id;
				if (orderId && razorpayOrderId) {
					void failPrintPayment(fetch, orderId, razorpayOrderId, failedResponse.error?.description);
					window.location.href = `/summary/failure/${orderId}/${razorpayOrderId}`;
				}
				return;
			});
		} catch (e) {
			// Explicitly type caught error as unknown
			console.error('Error during payment process:', e);
			// Provide more specific error feedback if possible
			toastStore.show(
				`An unexpected error occurred during payment: ${e instanceof Error ? e.message : 'Unknown error'}`,
				'error'
			);
			return;
		}
	}

	async function downloadModel() {
		if (!req?.model || !req?.id) return;
		const { data: userRes, error: userErr } = await supabase().auth.getSession();
		if (userErr || !userRes?.session?.access_token) {
			toastStore.show('You must be logged in to request a quote', 'error');
			return;
		}
		downloading = true;
		downloadProgress = 0;
		try {
			const result = await getModelDownloadUrl(fetch, req.id);
			if (!result.ok) {
				alert(result.error.message);
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
				onError: (message) => alert(message)
			});
		} catch {
			alert('Error downloading model');
			downloading = false;
			downloadProgress = 0;
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
		const result = await performPrintRequestAction(fetch, req.id, {
			action: 'cancel',
			payload: { reason: cancelReason.trim() }
		});
		if (!result.ok) {
			console.error('Error updating order', result.error);
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

	onMount(() => {
		//track unread counts by subscribing to the chat channel
		if (!data.session?.data?.user?.id) return;
		const chatSubscription = supabase()
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
			supabase().removeChannel(chatSubscription);
		};
	});

	// --- Highlight/Scroll helpers ---
	let addressSelectorRef: HTMLDivElement | null = $state(null);
	let payButtonRef: HTMLButtonElement | null = $state(null);
	let highlightAddress = $state(false);
	let highlightPay = $state(false);

	function highlightAddressSelector() {
		if (addressSelectorRef) {
			addressSelectorRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
			highlightAddress = true;
			setTimeout(() => (highlightAddress = false), 1200);
		}
	}

	function highlightPayButton() {
		if (payButtonRef) {
			payButtonRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
			highlightPay = true;
			setTimeout(() => (highlightPay = false), 1200);
		}
	}

	let completeDialogOpen = $state(false);
	let completeReason = $state('');

	async function onCancelComplete(e: MouseEvent) {
		e.preventDefault();
		completeDialogOpen = false;
		completeReason = '';
	}

	async function onConfirmComplete(e: MouseEvent) {
		e.preventDefault();
		if (!req || !data.session?.data?.user?.id) return;
		const result = await performPrintRequestAction(fetch, req.id, {
			action: 'complete',
			payload: completeReason.trim() ? { reason: completeReason.trim() } : {}
		});
		if (!result.ok) {
			console.error('Error updating order', result.error);
			return;
		}
		completeDialogOpen = false;
		completeReason = '';
		window.location.reload();
	}

	// --- Review Maker State ---
	let reviewDialogOpen = $state(false);
	let reviewDeleteDialogOpen = $state(false);
	let reviewRating = $state(5);
	let reviewComment = $state('');
	let reviewLoading = $state(false);
	let reviewError = $state('');
	let userReview: any = $state(null);

	// Fetch review for this user, maker, and print request
	async function fetchUserReview() {
		if (!data.session?.data?.user?.id || !req?.id || !req?.creator_id) return;
		reviewLoading = true;
		reviewError = '';
		const { data: review, error } = await supabase()
			.from('CreatorReviews')
			.select('*')
			.eq('user_id', data.session.data.user.id)
			.eq('maker_id', req.creator_id)
			.eq('print_request_id', req.id)
			.single();
		if (error && error.code !== 'PGRST116') reviewError = error.message;
		userReview = review || null;
		reviewLoading = false;
		if (userReview) {
			reviewRating = userReview.rating;
			reviewComment = userReview.comment;
		}
	}

	$effect(() => {
		if (req?.request_stage === 'completed') fetchUserReview();
	});

	async function openReviewDialog() {
		reviewError = '';
		reviewDialogOpen = true;
		if (userReview) {
			reviewRating = userReview.rating;
			reviewComment = userReview.comment;
		} else {
			reviewRating = 5;
			reviewComment = '';
		}
	}

	async function submitReview() {
		const order = req;
		if (!order) return;
		if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
			reviewError = 'Please select a rating.';
			return;
		}
		if (!reviewComment.trim()) {
			reviewError = 'Please enter a review.';
			return;
		}
		reviewLoading = true;
		const payload = {
			user_id: data.session.data.user.id,
			maker_id: order.creator_id,
			print_request_id: order.id,
			rating: reviewRating,
			comment: reviewComment.trim()
		};
		let result;
		if (userReview) {
			result = await supabase()
				.from('CreatorReviews')
				.update(payload)
				.eq('id', userReview.id)
				.select('*');
		} else {
			result = await supabase().from('CreatorReviews').insert(payload).select('*');
		}
		if (result.error) {
			reviewError = result.error.message;
			reviewLoading = false;
			return;
		}
		userReview = result.data?.[0] || userReview;
		reviewDialogOpen = false;
		reviewLoading = false;
		toastStore.show(userReview ? 'Review updated!' : 'Review added!', 'success');
	}

	async function deleteReview() {
		if (!userReview) return;
		reviewLoading = true;
		const { error } = await supabase().from('CreatorReviews').delete().eq('id', userReview.id);
		if (error) {
			reviewError = error.message;
			reviewLoading = false;
			return;
		}
		userReview = null;
		reviewDeleteDialogOpen = false;
		reviewDialogOpen = false;
		reviewLoading = false;
		reviewRating = 5;
		reviewComment = '';
		toastStore.show('Review deleted.', 'success');
	}
</script>

<svelte:head>
	<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 pb-16">
	<button
		type="button"
		onclick={() => goto('/3dp-portal/user')}
		class="mb-6 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
		<ArrowLeft class="size-3.5" strokeWidth={1.5} />
		back_to_requests
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
			{#if maker}
				<PortalCard>
					<PortalSectionLabel label="maker" />
					<div class="mt-2 space-y-1">
						<p class="font-medium text-foreground">{maker.name}</p>
						<p class="font-mono text-xs text-muted-foreground">
							{maker.email} · {maker.contact_number}
						</p>
					</div>
				</PortalCard>
			{/if}

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
					<span
						class={cn(
							'inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-xs capitalize',
							stageStyle(req.request_stage)
						)}>
						{req.request_stage?.replaceAll('_', ' ') ?? 'pending'}
					</span>
					<p class="text-sm leading-relaxed text-muted-foreground">
						{STAGE_DESCRIPTIONS[String(req.request_stage)] || 'No description available'}
					</p>
				</div>
			</PortalCard>

			{#if req.request_stage === 'completed'}
				<PortalCard>
					<PortalSectionLabel label="review_maker" />
					{#if reviewLoading}
						<ReviewCardSkeleton />
					{:else if userReview}
						<div class="mt-2 space-y-3">
							<div class="flex items-center gap-1">
								{#each [...Array(5).keys()] as i (i)}
									<Star
										class={cn(
											'size-4',
											i < userReview.rating
												? 'fill-foreground text-foreground'
												: 'text-muted-foreground/40'
										)}
										strokeWidth={1.5} />
								{/each}
							</div>
							<p class="text-sm text-foreground">{userReview.comment}</p>
							<div class="flex flex-wrap gap-2">
								<ScButton variant="secondary" onclick={openReviewDialog}>Edit review</ScButton>
								<ScButton variant="secondary" onclick={() => (reviewDeleteDialogOpen = true)}>
									Delete
								</ScButton>
							</div>
						</div>
					{:else}
						<div class="mt-2">
							<ScButton onclick={openReviewDialog}>Add review</ScButton>
						</div>
					{/if}
				</PortalCard>
			{/if}

			<PortalCard>
				<PortalSectionLabel label="actions" />
				<div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
					<button
						type="button"
						class="relative inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
						onclick={() => (messageBoardOpen = true)}>
						<MessageSquare class="size-4" strokeWidth={1.5} />
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
								<Download class="size-4" strokeWidth={1.5} />
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
							Cancel request
						</ScButton>
					{/if}

					{#if req.request_stage === 'shipped'}
						<ScButton
							variant="secondary"
							class="justify-center"
							onclick={() => (completeDialogOpen = true)}>
							<CheckCircle class="mr-1.5 size-4" strokeWidth={1.5} />
							Mark as delivered
						</ScButton>
					{/if}
				</div>
			</PortalCard>

			{#if req.request_stage === 'quoted'}
				<PortalCard>
					<PortalSectionLabel label="payment" />
					<div
						bind:this={addressSelectorRef}
						class="mt-2 rounded-md"
						class:highlight-animation={highlightAddress}>
						<AddressInputSelector
							email={data.session.data.user.email}
							userExists={true}
							addresses={data.addresses}
							bind:address={validAddress}
							bind:addressValid />
					</div>
					<button
						type="button"
						class="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
						class:ring-2={highlightPay}
						class:ring-foreground={highlightPay}
						class:ring-offset-2={highlightPay}
						disabled={payLoading || latestQuoteAmount == null}
						bind:this={payButtonRef}
						onclick={() => {
							void payQuote();
						}}>
						{payLoading ? 'Processing…' : `Pay ${latestQuoteAmount ?? latestQuote}₹`}
					</button>
				</PortalCard>
			{/if}

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
									{#if event.extra.amount}
										<p class="mt-1 font-mono text-xs text-muted-foreground">
											amount: {(Number(event.extra.amount) / 100).toFixed(2)}₹
										</p>
									{/if}
								{/if}
								<p class="mt-1 font-mono text-[10px] text-muted-foreground">
									by {event.by === 'user' ? 'you' : event.by}
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
				supabase_lt={supabase()}
				session={data.session}
				receiverId={req.creator_id ?? ''}
				disabled={req.request_stage === 'cancelled' || req.request_stage === 'completed'}
				paynow={() => {
					messageBoardOpen = false;
					highlightPayButton();
					toastStore.show('Select address and click pay now', 'info');
				}} />
		</Drawer.Content>
	</Drawer.Root>
{/if}

<Dialog.Root bind:open={cancelDialogOpen}>
	<Dialog.Content class="z-[1050] border-border bg-card">
		<Dialog.Header>
			<Dialog.Title>Cancel order</Dialog.Title>
			<Dialog.Description>
				Please provide a reason for cancellation. This action cannot be undone.
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

<Dialog.Root bind:open={completeDialogOpen}>
	<Dialog.Content class="z-[1050] border-border bg-card">
		<Dialog.Header>
			<Dialog.Title>Mark as delivered</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to mark this order as completed? This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Textarea
			bind:value={completeReason}
			class="mt-4 w-full"
			placeholder="(Optional) Add a note…" />
		<Dialog.Footer class="gap-2">
			<ScButton variant="secondary" onclick={onCancelComplete}>Cancel</ScButton>
			<ScButton onclick={onConfirmComplete}>Confirm</ScButton>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={reviewDialogOpen}>
	<Dialog.Content class="z-[1050] border-border bg-card">
		<Dialog.Header>
			<Dialog.Title>{userReview ? 'Edit your review' : 'Write a review'}</Dialog.Title>
		</Dialog.Header>
		<div class="space-y-4 py-2">
			<div>
				<p class="mb-2 font-mono text-xs text-muted-foreground">rating</p>
				<div class="flex gap-1">
					{#each [...Array(5).keys()] as i (i)}
						<button type="button" onclick={() => (reviewRating = i + 1)} class="p-1">
							<Star
								class={cn(
									'size-5',
									i < reviewRating ? 'fill-foreground text-foreground' : 'text-muted-foreground/40'
								)}
								strokeWidth={1.5} />
						</button>
					{/each}
				</div>
			</div>
			<div>
				<p class="mb-2 font-mono text-xs text-muted-foreground">your_review</p>
				<Textarea
					bind:value={reviewComment}
					class="min-h-24 w-full"
					placeholder="Share your experience…" />
			</div>
			{#if reviewError}
				<p class="text-sm text-destructive">{reviewError}</p>
			{/if}
		</div>
		<Dialog.Footer class="gap-2">
			<ScButton variant="secondary" onclick={() => (reviewDialogOpen = false)}>Cancel</ScButton>
			<ScButton onclick={submitReview}>
				{reviewLoading ? 'Submitting…' : userReview ? 'Update review' : 'Submit review'}
			</ScButton>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={reviewDeleteDialogOpen}>
	<Dialog.Content class="z-[1050] border-border bg-card">
		<Dialog.Header>
			<Dialog.Title>Delete your review</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete your review? This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="gap-2">
			<ScButton variant="secondary" onclick={() => (reviewDeleteDialogOpen = false)}>
				Cancel
			</ScButton>
			<button
				type="button"
				class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
				onclick={deleteReview}>
				Delete review
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	@keyframes highlight {
		0% {
			background-color: hsl(var(--muted));
		}
		100% {
			background-color: transparent;
		}
	}

	.highlight-animation {
		animation: highlight 1.5s ease-out;
	}
</style>
