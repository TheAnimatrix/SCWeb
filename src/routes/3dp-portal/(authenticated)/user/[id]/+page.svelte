<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import MessageBoard from '$lib/components/maker/MessageBoard.svelte';
	import { env } from '$env/dynamic/public';
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
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import AddressInputSelector from '$lib/components/fundamental/AddressInputSelector.svelte';
	import {
		PortalCard,
		PortalSectionLabel,
		PrintEventHistory,
		PrintRequestSupport
	} from '$lib/components/portal';
	import { MetaChip, ReviewCardSkeleton, ScButton } from '$lib/components/sc';
	import { newAddress, validateAddress, type Address } from '$lib/types/product';
	import { cn } from '$lib/utils';
	import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';
	import { loadRazorpay, openRazorpayCheckout } from '$lib/client/razorpay';
	import {
		asPrintRequest,
		getPrintRequestDisplayName,
		isPaidStage,
		printStageLabel
	} from '$lib/types/printRequest';
	import { formatDateTime, formatInr } from '$lib/utils/format';
	import type { CreatorReview } from '$lib/types/database';
	let { data } = $props();

	function supabase() {
		return requireBrowserSupabase(data.supabase);
	}

	const req = $derived(asPrintRequest(data.printRequest));

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

	const displayModelName = $derived.by(() =>
		getPrintRequestDisplayName(req?.model, req?.model_metadata)
	);

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

	const stageDescription = $derived.by(() => {
		switch (req?.request_stage) {
			case 'cancelled':
				return 'This request was cancelled.';
			case 'requested':
				return 'Your request was sent. The maker will reply with a price. You can message them below.';
			case 'quoted':
				return latestQuoteAmount != null
					? `The maker quoted ${formatInr(latestQuoteAmount)}. Pay below to start printing, or cancel the request.`
					: 'The maker sent a price. Pay below to start printing, or cancel the request.';
			case 'paid':
			case 'paid_externally':
				return "You've paid. The maker will print your part and ship it to your address.";
			case 'shipped':
				return 'The maker has shipped your print. When it arrives, mark it as delivered.';
			case 'completed':
				return 'You confirmed delivery. You can leave a review for the maker.';
			case 'in dispute':
				return 'Selfcrafted is looking into this request.';
			default:
				return "We can't show the status of this request. Contact support.";
		}
	});

	let payLoading = $state(false);

	/**
	 * Set when Razorpay took a payment that this page could not confirm, or that was not needed.
	 * Kept in sessionStorage so a reload does not offer Pay again. Pay stays disabled while set.
	 */
	type PaymentNotice = { paymentId: string; kind: 'unconfirmed' | 'duplicate' };
	let paymentNotice = $state<PaymentNotice | null>(null);

	function paymentNoticeKey(requestId: string) {
		return `sc:print-payment-notice:${requestId}`;
	}

	function readPaymentNotice(requestId: string): PaymentNotice | null {
		try {
			const raw = sessionStorage.getItem(paymentNoticeKey(requestId));
			const parsed: unknown = raw ? JSON.parse(raw) : null;
			if (
				parsed &&
				typeof parsed === 'object' &&
				typeof (parsed as PaymentNotice).paymentId === 'string' &&
				((parsed as PaymentNotice).kind === 'unconfirmed' ||
					(parsed as PaymentNotice).kind === 'duplicate')
			) {
				return parsed as PaymentNotice;
			}
		} catch {
			// Storage blocked or bad JSON: the in-memory notice still applies.
		}
		return null;
	}

	function savePaymentNotice(requestId: string, notice: PaymentNotice) {
		paymentNotice = notice;
		try {
			sessionStorage.setItem(paymentNoticeKey(requestId), JSON.stringify(notice));
		} catch {
			// The in-memory notice still keeps Pay disabled until a reload.
		}
	}

	$effect(() => {
		const requestId = req?.id;
		const stage = req?.request_stage;
		if (!requestId) return;
		const stored = readPaymentNotice(requestId);
		if (stored?.kind === 'unconfirmed' && isPaidStage(stage)) {
			// The server has the payment now.
			try {
				sessionStorage.removeItem(paymentNoticeKey(requestId));
			} catch {
				// Nothing to clear.
			}
			paymentNotice = null;
			return;
		}
		if (stored) paymentNotice = stored;
	});

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

		const razorpayKey = env.PUBLIC_RAZORPAY_ID;
		if (!razorpayKey) {
			toastStore.show("Payments aren't available right now. Contact support.", 'error');
			payLoading = false;
			return;
		}

		try {
			const orderResult = await createPrintPaymentOrder(fetch, order.id, validAddress);
			if (!orderResult.ok) {
				if (orderResult.error.kind === 'already_paid') {
					// The previous payment went through after all; the request is now paid.
					toastStore.show(orderResult.error.message, 'info');
					await invalidate('3dp-portal:printrequest');
					payLoading = false;
					return;
				}
				toastStore.show(orderResult.error.message, 'error');
				payLoading = false;
				return;
			}

			const requestId = order.id;
			const razorpayOrderId = orderResult.data.razorpayOrderId;
			// Razorpay said the money moved. From then on, never offer Pay again.
			let captured = false;
			let failedRazorpayOrderId: string | null = null;
			let failureReason: string | undefined;

			const outcome = await openRazorpayCheckout({
				key: razorpayKey,
				amount: orderResult.data.amountPaise,
				currency: 'INR',
				name: 'Selfcrafted',
				image: new URL('/favicon.png', window.location.origin).href,
				order_id: razorpayOrderId,
				handler: async function (response) {
					captured = true;
					const payload = {
						razorpayOrderId: response.razorpay_order_id,
						razorpayPaymentId: response.razorpay_payment_id,
						razorpaySignature: response.razorpay_signature
					};
					try {
						let confirmResult = await confirmPrintPayment(fetch, requestId, payload);
						for (let attempt = 0; attempt < 2 && !confirmResult.ok; attempt++) {
							await new Promise((done) => setTimeout(done, 1500));
							confirmResult = await confirmPrintPayment(fetch, requestId, payload);
						}
						if (confirmResult.ok) {
							// eslint-disable-next-line svelte/no-navigation-without-resolve -- result page built from Razorpay ids
							await goto(`/summary/success/${requestId}/${response.razorpay_payment_id}`);
							return;
						}
						if (confirmResult.error.kind === 'duplicate_payment') {
							// Already paid by another payment; this one is recorded for a refund.
							savePaymentNotice(requestId, {
								paymentId: response.razorpay_payment_id,
								kind: 'duplicate'
							});
							payLoading = false;
							await invalidate('3dp-portal:printrequest');
							return;
						}
					} catch {
						// Fall through: the payment exists, we just couldn't confirm it from here.
					}
					// Keep Pay disabled. The Razorpay webhook marks the request paid on its own.
					savePaymentNotice(requestId, {
						paymentId: response.razorpay_payment_id,
						kind: 'unconfirmed'
					});
				},
				modal: {
					ondismiss: async function () {
						if (captured || failedRazorpayOrderId) return;
						payLoading = false;
						invalidate('3dp-portal:printrequest');
						toastStore.show('Payment cancelled. You can try again.', 'warning');
					}
				},
				prefill: {},
				theme: {
					color: '#2084fe'
				},
				onPaymentFailed: function (failedResponse) {
					// Razorpay keeps its own "Retry" screen open and the buyer may still pay, so only
					// remember the failure. It is reported once the modal closes without a payment.
					failedRazorpayOrderId = failedResponse.error?.metadata?.order_id ?? razorpayOrderId;
					failureReason = failedResponse.error?.description;
				}
			});

			if (captured) return;
			if (outcome === 'failed' && failedRazorpayOrderId) {
				try {
					await failPrintPayment(fetch, requestId, failedRazorpayOrderId, failureReason);
				} catch {
					// The webhook records the failure too.
				}
				window.location.href = `/summary/failure/${requestId}/${failedRazorpayOrderId}`;
				return;
			}
			payLoading = false;
		} catch (e) {
			console.error('Error during payment process:', e);
			const message =
				e instanceof Error && e.message.includes('Razorpay')
					? "Couldn't reach the payment provider. Try again."
					: 'Something went wrong with the payment. Try again or contact support.';
			toastStore.show(message, 'error');
			payLoading = false;
		}
	}

	async function downloadModel() {
		if (!req?.model || !req?.id) return;
		const { data: userRes, error: userErr } = await supabase().auth.getSession();
		if (userErr || !userRes?.session?.access_token) {
			toastStore.show('Sign in to download this model.', 'error');
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
			toastStore.show("Couldn't download the model. Try again.", 'error');
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
			toastStore.show(result.error.message, 'error');
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
		void loadRazorpay().catch(() => {
			// payQuote() will surface a user-facing error if the SDK is still unavailable.
		});
	});

	$effect(() => {
		const userId = data.session?.data?.user?.id;
		const orderId = req?.id;
		if (!userId || !orderId) return;

		const chatSubscription = supabase()
			.channel(`user-order-chat:${userId}:${orderId}`)
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
			toastStore.show(result.error.message, 'error');
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
	let userReview: CreatorReview | null = $state(null);

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
			reviewRating = userReview.rating ?? 5;
			reviewComment = userReview.comment ?? '';
		}
	}

	$effect(() => {
		if (req?.request_stage === 'completed') fetchUserReview();
	});

	async function openReviewDialog() {
		reviewError = '';
		reviewDialogOpen = true;
		if (userReview) {
			reviewRating = userReview.rating ?? 5;
			reviewComment = userReview.comment ?? '';
		} else {
			reviewRating = 5;
			reviewComment = '';
		}
	}

	async function submitReview() {
		const order = req;
		if (!order) return;
		if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
			reviewError = 'Choose a rating.';
			return;
		}
		if (!reviewComment.trim()) {
			reviewError = 'Write a few words about the print.';
			return;
		}
		const userId = data.session?.data?.user?.id;
		if (!userId) {
			reviewError = 'Sign in again to leave a review.';
			return;
		}
		reviewLoading = true;
		const payload = {
			user_id: userId,
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
		toastStore.show('Review saved.', 'success');
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

<div class="mx-auto max-w-7xl px-4 pb-16">
	<a
		href={resolve('/3dp-portal/(authenticated)/user')}
		class="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
		<Icon icon={F.arrowLeft} class="size-3.5" aria-hidden="true" />
		My print requests
	</a>

	{#if !req}
		<PortalCard class="py-16 text-center">
			<p class="text-sm text-destructive">Print request not found.</p>
		</PortalCard>
	{:else}
		<header class="mb-8 border-b border-border pb-8">
			<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">{displayModelName}</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				Requested {formatDateTime(req.created_at)}
			</p>
		</header>

		<div class="grid gap-4">
			{#if maker}
				<PortalCard>
					<PortalSectionLabel label="Maker" />
					<div class="mt-2 space-y-1">
						<p class="font-medium text-foreground">{maker.name ?? 'Maker'}</p>
						{#if maker.email || maker.contact_number}
							<p class="text-sm text-muted-foreground">
								{[maker.email, maker.contact_number].filter(Boolean).join(' · ')}
							</p>
						{:else}
							<p class="text-sm text-muted-foreground">Use Message below to talk to the maker.</p>
						{/if}
					</div>
				</PortalCard>
			{/if}

			<PortalCard>
				<PortalSectionLabel label="Print settings" />
				<div class="mt-2 flex flex-wrap gap-1.5">
					<MetaChip>
						<span class="inline-flex items-center gap-1.5">
							Colour
							<span
								class="inline-block size-3 rounded-sm border border-border"
								style={`background-color:${req.model_data.color}`}></span>
						</span>
					</MetaChip>
					<MetaChip>Material: {req.model_data.material}</MetaChip>
					<MetaChip tone="muted">Quality: {req.model_data.quality}</MetaChip>
					<MetaChip tone="muted">Scale: {req.model_data.scale}x</MetaChip>
					<MetaChip tone="muted">Infill: {req.model_data.infill}%</MetaChip>
					{#if req.model_data.walls != null}
						<MetaChip tone="muted">Walls: {req.model_data.walls}</MetaChip>
					{/if}
				</div>
			</PortalCard>

			<PortalCard>
				<PortalSectionLabel label="Status" />
				<div class="mt-2 space-y-2">
					<span
						class={cn(
							'inline-flex items-center rounded-md border px-2.5 py-1 text-xs',
							stageStyle(req.request_stage)
						)}>
						{printStageLabel(req.request_stage)}
					</span>
					<p class="text-sm leading-relaxed text-muted-foreground">{stageDescription}</p>
				</div>
			</PortalCard>

			{#if req.request_stage === 'completed'}
				<PortalCard>
					<PortalSectionLabel label="Your review" />
					{#if reviewLoading}
						<ReviewCardSkeleton />
					{:else if userReview}
						<div class="mt-2 space-y-3">
							<div
								class="flex items-center gap-1"
								role="img"
								aria-label="Rated {userReview.rating} out of 5">
								{#each [...Array(5).keys()] as i (i)}
									<Icon
										aria-hidden="true"
										icon={F.star}
										class={cn(
											'size-4',
											i < (userReview.rating ?? 0)
												? 'fill-foreground text-foreground'
												: 'text-muted-foreground/40'
										)} />
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
				<PortalSectionLabel label="Actions" />
				<div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
					<button
						type="button"
						class="relative inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
						onclick={() => (messageBoardOpen = true)}>
						<Icon icon={F.chat} class="size-4" />
						Message
						{#if unreadCount > 0}
							<span
								class="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-destructive/30 bg-destructive px-1.5 py-0.5 text-xs text-destructive-foreground"
								aria-label="{unreadCount} unread">
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
							<Icon icon={F.checkCircle} class="mr-1.5 size-4" />
							Mark as delivered
						</ScButton>
					{/if}
				</div>
				{#if isPaidStage(req.request_stage)}
					<div class="mt-4">
						<PrintRequestSupport requestId={req.id} />
					</div>
				{/if}
			</PortalCard>

			{#if paymentNotice}
				<p class="rounded-md border border-border bg-card p-3 text-sm" role="alert">
					{#if paymentNotice.kind === 'duplicate'}
						This request was already paid, so your latest payment was not needed.
						<strong>Don't pay again.</strong>
						Write to
					{:else}
						Your payment went through, but we couldn't confirm it from this page.
						<strong>Don't pay again.</strong>
						Reload in a minute. If the request still shows as unpaid, write to
					{/if}
					<a
						class="underline underline-offset-2"
						href="mailto:support@selfcrafted.in?subject={encodeURIComponent(
							`Print payment ${paymentNotice.paymentId}`
						)}">support@selfcrafted.in</a>
					with payment ref {paymentNotice.paymentId}.
				</p>
			{/if}

			{#if req.request_stage === 'quoted'}
				<PortalCard>
					<PortalSectionLabel label="Payment" />
					<div
						bind:this={addressSelectorRef}
						class="mt-2 rounded-md"
						class:highlight-animation={highlightAddress}>
						<AddressInputSelector
							email={data.session.data.user?.email}
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
						disabled={payLoading || latestQuoteAmount == null || paymentNotice != null}
						bind:this={payButtonRef}
						onclick={() => {
							void payQuote();
						}}>
						{payLoading
							? 'Processing…'
							: latestQuoteAmount != null
								? `Pay ${formatInr(latestQuoteAmount)}`
								: 'Pay'}
					</button>
					<p class="mt-2 text-sm text-muted-foreground">This is the maker's quoted price.</p>
					<p class="mt-1 text-sm">
						<a class="text-foreground underline underline-offset-2" href={resolve('/policy')}
							>Cancellation and refunds</a>
					</p>
				</PortalCard>
			{/if}

			<PrintEventHistory events={sortedEvents} viewer="customer" />
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
				receiverId={req.creator_id ?? ''}
				disabled={req.request_stage === 'cancelled' || req.request_stage === 'completed'}
				paynow={() => {
					messageBoardOpen = false;
					highlightPayButton();
					toastStore.show('Choose an address, then select Pay.', 'info');
				}} />
		</Drawer.Content>
	</Drawer.Root>
{/if}

<Dialog.Root bind:open={cancelDialogOpen}>
	<Dialog.Content class="z-[1050] border-border bg-card">
		<Dialog.Header>
			<Dialog.Title>Cancel this request?</Dialog.Title>
			<Dialog.Description>Tell the maker why. You can't undo this.</Dialog.Description>
		</Dialog.Header>
		<Textarea
			bind:value={cancelReason}
			class="mt-4 w-full"
			aria-label="Reason for cancelling"
			placeholder="For example: I found another way to make it." />
		<Dialog.Footer class="gap-2">
			<ScButton variant="secondary" onclick={onCancelCancel}>Keep request</ScButton>
			<button
				type="button"
				class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
				onclick={onConfirmCancel}
				disabled={!cancelReason.trim()}>
				Cancel request
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={completeDialogOpen}>
	<Dialog.Content class="z-[1050] border-border bg-card">
		<Dialog.Header>
			<Dialog.Title>Mark as delivered</Dialog.Title>
			<Dialog.Description>
				Confirm you've received the print? This closes the order and lets you leave a review.
			</Dialog.Description>
		</Dialog.Header>
		<Textarea
			bind:value={completeReason}
			class="mt-4 w-full"
			aria-label="Note for the maker (optional)"
			placeholder="Note for the maker (optional)" />
		<Dialog.Footer class="gap-2">
			<ScButton variant="secondary" onclick={onCancelComplete}>Not yet</ScButton>
			<ScButton onclick={onConfirmComplete}>Yes, I've received it</ScButton>
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
				<p id="review-rating-label" class="mb-2 text-sm font-medium text-foreground">Rating</p>
				<div class="flex gap-1" role="group" aria-labelledby="review-rating-label">
					{#each [...Array(5).keys()] as i (i)}
						<button
							type="button"
							onclick={() => (reviewRating = i + 1)}
							class="p-1"
							aria-label="Rate {i + 1} out of 5"
							aria-pressed={reviewRating === i + 1}>
							<Icon
								aria-hidden="true"
								icon={F.star}
								class={cn(
									'size-5',
									i < reviewRating ? 'fill-foreground text-foreground' : 'text-muted-foreground/40'
								)} />
						</button>
					{/each}
				</div>
			</div>
			<div>
				<label for="review-comment" class="mb-2 block text-sm font-medium text-foreground"
					>Your review</label>
				<Textarea
					id="review-comment"
					bind:value={reviewComment}
					class="min-h-24 w-full"
					placeholder="Share your experience…" />
			</div>
			{#if reviewError}
				<p class="text-sm text-destructive" role="alert">{reviewError}</p>
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
			<Dialog.Title>Delete your review?</Dialog.Title>
			<Dialog.Description>You can't undo this.</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="gap-2">
			<ScButton variant="secondary" onclick={() => (reviewDeleteDialogOpen = false)}>
				Keep review
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
