<script lang="ts">
	import Icon from '@iconify/svelte';
	import { tick } from 'svelte';
	import { beforeNavigate, invalidateAll } from '$app/navigation';
	import {
		INTEREST_LAUNCH_MESSAGE_MAX,
		INTEREST_NOTE_MAX,
		INTEREST_SHIP_DAYS_MAX,
		INTEREST_SHIP_DAYS_MIN,
		INTEREST_TARGET_MAX,
		INTEREST_TARGET_MIN,
		type InterestNotifyResponse,
		type MakerInterestSummary,
		type MakerListingInterest
	} from '@scweb/api/contracts';
	import {
		closeMyListingInterest,
		getMyListingInterest,
		launchMyListingInterest,
		setMyListingState,
		updateListingStock,
		uploadMakerAsset,
		upsertMyListing,
		INTEREST_LOCKED_MESSAGE
	} from '$lib/client/makersApi';
	import { ScButton, ScInput } from '$lib/components/sc';
	import { SeoHead } from '$lib/components/seo';
	import * as Dialog from '$lib/components/ui/dialog';
	import { F } from '$lib/icons/fluent';
	import { productPath } from '$lib/seo/product';
	import { formatDate, formatInr } from '$lib/utils/format';

	let { data } = $props();

	const MAX_IMAGES = 12;
	const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
	const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

	const TYPE_OPTIONS = [
		{ value: 'product', label: 'Product (kit or finished device)' },
		{ value: 'spare', label: 'Spare part' },
		{ value: 'flea-market', label: 'Flea market (used or one-off)' }
	];

	const STATE_LABELS: Record<string, string> = {
		live: 'Live',
		pending_review: 'In review, hidden from buyers',
		draft: 'Draft, not submitted',
		paused: 'Paused, hidden from buyers',
		rejected: 'Not approved',
		archived: 'Archived'
	};

	type Listing = {
		id: string;
		name: string | null;
		price: { new: number; old: number } | null;
		stock: { count: number; status: string } | null;
		images: { url: string }[] | null;
		type: string | null;
		tags: string[];
		guarantee: string | null;
		description: string;
		docs: string;
		costing: string;
		shipping: string;
		listing_state: string;
		review_notes?: string | null;
		interest?: MakerListingInterest | null;
	};

	type RowFeedback = { text: string; error: boolean };

	const listings = $derived((data.listings ?? []) as Listing[]);

	let editing = $state<Listing | null>(null);
	let name = $state('');
	let priceNew = $state('');
	let priceOld = $state('');
	let stock = $state('1');
	let type = $state('product');
	let tagsText = $state('');
	let guarantee = $state('');
	let description = $state('');
	let docs = $state('');
	let costing = $state('');
	let shipping = $state('');
	let images = $state<{ url: string }[]>([]);
	let interestEnabled = $state(false);
	let interestTarget = $state('');
	let interestDays = $state('');
	let interestNote = $state('');
	let busy = $state(false);
	let uploadStatus = $state('');
	let stateBusyId = $state('');
	let formMessage = $state('');
	let formError = $state('');
	let rowFeedback = $state<Record<string, RowFeedback>>({});
	let baseline = $state('');
	let formEl = $state<HTMLFormElement | null>(null);
	const nameInputId = 'listing-name';
	let imageInput = $state<HTMLInputElement | null>(null);

	/** Number inputs bind as numbers (or null when empty), so normalise before reading. */
	function text(value: unknown): string {
		return value == null ? '' : String(value).trim();
	}

	function snapshot() {
		return JSON.stringify({
			name,
			priceNew: text(priceNew),
			priceOld: text(priceOld),
			stock: text(stock),
			type,
			tagsText,
			guarantee,
			description,
			docs,
			costing,
			shipping,
			images,
			interestEnabled,
			interestTarget: text(interestTarget),
			interestDays: text(interestDays),
			interestNote
		});
	}

	baseline = snapshot();

	const dirty = $derived(snapshot() !== baseline);
	const editingInterest = $derived(editing?.interest ?? null);
	/** Launched or closed checks are ordinary listings now; only new or open ones show the section. */
	const showInterestSection = $derived(!editingInterest || editingInterest.status === 'open');
	/** Once people have joined, the target and shipping time are a commitment. */
	const interestLocked = $derived(editingInterest?.status === 'open' && editingInterest.locked);
	const interestOn = $derived(showInterestSection && interestEnabled);
	const editingState = $derived(editing?.listing_state ?? null);
	const editingVisible = $derived(editingState === 'live' || editingState === 'paused');
	const canSubmitForReview = $derived(
		!editing || editingState === 'draft' || editingState === 'rejected'
	);

	/** Mirrors the server rule: name, price, photos or type changes on a live/paused listing need review again. */
	const materialChange = $derived.by(() => {
		if (!editing || !editingVisible) return false;
		const price = editing.price ?? { new: 0, old: 0 };
		if (name.trim() !== (editing.name ?? '')) return true;
		if (Number(text(priceNew)) !== price.new) return true;
		if ((Number(text(priceOld)) || 0) !== price.old) return true;
		if (type !== (editing.type ?? 'product')) return true;
		return JSON.stringify(images) !== JSON.stringify(editing.images ?? []);
	});

	beforeNavigate((navigation) => {
		if (!dirty || busy) return;
		if (navigation.type === 'leave') {
			navigation.cancel();
			return;
		}
		if (!confirm('You have an unsaved listing. Leave without saving?')) {
			navigation.cancel();
		}
	});

	function resetForm() {
		editing = null;
		name = '';
		priceNew = '';
		priceOld = '';
		stock = '1';
		type = 'product';
		tagsText = '';
		guarantee = '';
		description = '';
		docs = '';
		costing = '';
		shipping = '';
		images = [];
		interestEnabled = false;
		interestTarget = '';
		interestDays = '';
		interestNote = '';
		formError = '';
		baseline = snapshot();
	}

	function cancelEdit() {
		if (dirty && !confirm('Discard your changes to this listing?')) return;
		resetForm();
		formMessage = '';
	}

	async function startEdit(listing: Listing) {
		if (dirty && !confirm('Discard your unsaved changes and edit this listing instead?')) return;
		editing = listing;
		name = listing.name ?? '';
		priceNew = String(listing.price?.new ?? '');
		priceOld = listing.price?.old ? String(listing.price.old) : '';
		stock = String(listing.stock?.count ?? 0);
		type = listing.type ?? 'product';
		tagsText = (listing.tags ?? []).join(', ');
		guarantee = listing.guarantee ?? '';
		description = listing.description ?? '';
		docs = listing.docs ?? '';
		costing = listing.costing ?? '';
		shipping = listing.shipping ?? '';
		images = [...(listing.images ?? [])];
		const interest = listing.interest ?? null;
		interestEnabled = interest?.status === 'open';
		interestTarget = interest ? String(interest.target_count) : '';
		interestDays = interest ? String(interest.ships_within_days) : '';
		interestNote = interest?.note ?? '';
		formMessage = '';
		formError = '';
		baseline = snapshot();
		await tick();
		formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		document.getElementById(nameInputId)?.focus({ preventScroll: true });
	}

	function parseTags(value: string): string[] {
		return value
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
	}

	function validate(): string | null {
		if (name.trim().length < 2) return 'Name must be at least 2 characters.';
		const price = Number(text(priceNew));
		if (!text(priceNew) || !Number.isFinite(price)) return 'Enter a price.';
		if (!Number.isInteger(price)) return 'Price must be in whole rupees.';
		if (price < 1) return 'Price must be at least ₹1.';
		if (text(priceOld)) {
			const old = Number(text(priceOld));
			if (!Number.isInteger(old) || old < 0) return 'Original price must be in whole rupees.';
		}
		if (interestOn) {
			const target = Number(text(interestTarget));
			if (
				!text(interestTarget) ||
				!Number.isInteger(target) ||
				target < INTEREST_TARGET_MIN ||
				target > INTEREST_TARGET_MAX
			)
				return `People you need must be a whole number from ${INTEREST_TARGET_MIN} to ${INTEREST_TARGET_MAX}.`;
			const days = Number(text(interestDays));
			if (
				!text(interestDays) ||
				!Number.isInteger(days) ||
				days < INTEREST_SHIP_DAYS_MIN ||
				days > INTEREST_SHIP_DAYS_MAX
			)
				return `Ships within must be a whole number of days from ${INTEREST_SHIP_DAYS_MIN} to ${INTEREST_SHIP_DAYS_MAX}.`;
			if (interestNote.trim().length > INTEREST_NOTE_MAX)
				return `Note for buyers must be ${INTEREST_NOTE_MAX} characters or fewer.`;
		} else {
			const count = Number(text(stock));
			if (!text(stock) || !Number.isInteger(count) || count < 0)
				return 'Stock must be a whole number, 0 or more.';
		}
		if (images.length > MAX_IMAGES) return `You can add up to ${MAX_IMAGES} images.`;
		return null;
	}

	async function saveListing(submitForReview: boolean) {
		formMessage = '';
		formError = validate() ?? '';
		if (formError) return;
		if (
			materialChange &&
			editingState === 'live' &&
			!confirm(
				'Changing the name, price, photos or type sends this listing back for review. It is hidden from buyers until it is approved again. Save anyway?'
			)
		) {
			return;
		}

		busy = true;
		const wasVisible = editingVisible;
		const result = await upsertMyListing(fetch, {
			product_id: editing?.id ?? undefined,
			name: name.trim(),
			price_new: Number(text(priceNew)),
			price_old: text(priceOld) ? Number(text(priceOld)) : 0,
			// An interest check has nothing in stock until the maker launches it.
			stock_count: interestOn ? 0 : Number(text(stock)),
			type,
			tags: parseTags(tagsText),
			images,
			guarantee: guarantee.trim() || null,
			description,
			docs,
			costing,
			shipping,
			submit_for_review: submitForReview,
			...(showInterestSection
				? {
						interest: interestOn
							? {
									enabled: true,
									target_count: Number(text(interestTarget)),
									ships_within_days: Number(text(interestDays)),
									note: interestNote.trim() || null
								}
							: { enabled: false }
					}
				: {})
		});
		busy = false;
		if (!result.ok) {
			formError =
				result.error.code === 'interest_locked' ? INTEREST_LOCKED_MESSAGE : result.error.message;
			return;
		}
		// The API returns the stored row, whose field is `listingState`.
		const saved = result.data.listing as { listingState?: string; listing_state?: string } | null;
		const state = saved?.listingState ?? saved?.listing_state;
		formMessage =
			state === 'pending_review' && wasVisible
				? 'Saved. This listing is now in review and hidden from buyers until it is approved.'
				: state === 'pending_review'
					? 'Submitted for review.'
					: state === 'draft'
						? 'Draft saved.'
						: 'Changes saved.';
		resetForm();
		await invalidateAll();
	}

	function trySave(submitForReview: boolean) {
		if (formEl && !formEl.reportValidity()) return;
		void saveListing(submitForReview);
	}

	function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		trySave(false);
	}

	function setRowFeedback(id: string, text: string, error = false) {
		rowFeedback = { ...rowFeedback, [id]: { text, error } };
	}

	async function saveStock(listing: Listing, input: HTMLInputElement) {
		const previous = String(listing.stock?.count ?? 0);
		const count = Number(input.value);
		if (!input.value.trim() || !Number.isInteger(count) || count < 0) {
			setRowFeedback(listing.id, 'Stock must be a whole number, 0 or more.', true);
			input.value = previous;
			return;
		}
		setRowFeedback(listing.id, 'Saving stock…');
		const result = await updateListingStock(fetch, listing.id, count);
		if (!result.ok) {
			setRowFeedback(listing.id, `Stock not saved. ${result.error.message}`, true);
			input.value = previous;
			return;
		}
		setRowFeedback(listing.id, 'Stock saved.');
		await invalidateAll();
	}

	async function setState(listing: Listing, state: 'paused' | 'live' | 'archived') {
		if (
			state === 'archived' &&
			!confirm(
				`Archive "${listing.name ?? 'this listing'}"? It is removed from the store and you can't restore it yourself.`
			)
		) {
			return;
		}
		stateBusyId = listing.id;
		const result = await setMyListingState(fetch, listing.id, state);
		stateBusyId = '';
		if (!result.ok) {
			setRowFeedback(listing.id, result.error.message, true);
			return;
		}
		setRowFeedback(
			listing.id,
			state === 'paused'
				? 'Paused. Buyers can no longer see it.'
				: state === 'live'
					? 'Live again.'
					: 'Archived.'
		);
		await invalidateAll();
	}

	async function onImagesSelected(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = '';
		if (!files.length) return;
		formError = '';

		const room = MAX_IMAGES - images.length;
		const queue = files.slice(0, room);
		const problems: string[] = [];
		if (files.length > room) {
			problems.push(
				`Only ${MAX_IMAGES} images are allowed, so ${files.length - room} were skipped.`
			);
		}

		for (const [index, file] of queue.entries()) {
			if (!IMAGE_TYPES.includes(file.type)) {
				problems.push(`${file.name}: use a JPG, PNG, WebP or GIF image.`);
				continue;
			}
			if (file.size > MAX_IMAGE_BYTES) {
				problems.push(`${file.name}: image must be 5 MB or smaller.`);
				continue;
			}
			uploadStatus = queue.length > 1 ? `Uploading ${index + 1} of ${queue.length}…` : 'Uploading…';
			const result = await uploadMakerAsset(fetch, file, 'listing');
			if (!result.ok) {
				problems.push(`${file.name}: ${result.error.message}`);
				continue;
			}
			images = [...images, { url: result.data.url }];
		}
		uploadStatus = '';
		formError = problems.join(' ');
	}

	function removeImage(index: number) {
		images = images.filter((_, i) => i !== index);
	}

	function moveImage(index: number, delta: -1 | 1) {
		const target = index + delta;
		if (target < 0 || target >= images.length) return;
		const next = [...images];
		[next[index], next[target]] = [next[target], next[index]];
		images = next;
	}

	function liveHref(listing: Listing): string {
		return productPath({ id: listing.id, name: listing.name ?? '' });
	}

	// --- Interest check dialogs (view, launch, close) ---

	type InterestDialog = {
		kind: 'view' | 'launch' | 'close';
		id: string;
		name: string;
		count: number;
		target: number;
	};

	let interestDialog = $state<InterestDialog | null>(null);
	let interestDialogOpen = $state(false);
	let dialogReturnFocus: HTMLElement | null = null;
	let summary = $state<MakerInterestSummary | null>(null);
	let summaryLoading = $state(false);
	let dialogBusy = $state(false);
	let dialogError = $state('');
	let launchStock = $state('');
	let interestMessage = $state('');
	let summaryRequest = 0;

	function launchBlockedReason(listing: Listing): string {
		const state = listing.listing_state ?? '';
		if (state === 'live') return '';
		if (state === 'pending_review') return 'This listing is still in review.';
		if (state === 'paused') return 'Resume this listing to launch it.';
		return 'Submit this listing for review first.';
	}

	function openInterestDialog(kind: InterestDialog['kind'], listing: Listing, event: MouseEvent) {
		const interest = listing.interest;
		if (!interest) return;
		dialogReturnFocus = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
		interestDialog = {
			kind,
			id: listing.id,
			name: listing.name ?? 'this listing',
			count: interest.interested_count,
			target: interest.target_count
		};
		dialogBusy = false;
		dialogError = '';
		launchStock = '';
		interestMessage = '';
		summary = null;
		interestDialogOpen = true;
		if (kind === 'view') void loadSummary(listing.id);
	}

	function restoreFocus(event: Event) {
		// The row button may be gone after a launch; fall back to the default behaviour then.
		if (dialogReturnFocus?.isConnected) {
			event.preventDefault();
			dialogReturnFocus.focus();
		}
	}

	async function loadSummary(productId: string) {
		const request = ++summaryRequest;
		summaryLoading = true;
		const result = await getMyListingInterest(fetch, productId);
		if (request !== summaryRequest) return;
		summaryLoading = false;
		if (!result.ok) {
			dialogError = result.error.message;
			return;
		}
		summary = result.data;
	}

	/** The e-mails go out in the background; `pending` is who is still to be e-mailed. */
	function notifyResultText(kind: 'launch' | 'close', data: InterestNotifyResponse): string {
		const done = kind === 'launch' ? 'Launched.' : 'Closed.';
		return data.pending > 0 ? `${done} We're emailing ${data.pending} people now.` : done;
	}

	/** Row label for a merged small-places group (`city: ''` / `state: ''`). */
	function placeLabel(value: string): string {
		return value === '' ? 'Other places' : value;
	}

	// After a launch or closure, refresh the rows while e-mails are still going out: every
	// 5 seconds, at most 12 times per launch, close or resend (and once per visit otherwise).
	const POLL_INTERVAL_MS = 5000;
	const POLL_MAX = 12;
	let pollsLeft = POLL_MAX;
	let resendBusyId = $state('');

	function hasPending(listing: Listing): boolean {
		const interest = listing.interest;
		return !!interest && interest.status !== 'open' && interest.pending_count > 0;
	}

	$effect(() => {
		// Re-runs whenever the rows reload, so each refresh schedules the next one.
		if (!listings.some(hasPending) || pollsLeft <= 0) return;
		const timer = setTimeout(() => {
			pollsLeft -= 1;
			void invalidateAll();
		}, POLL_INTERVAL_MS);
		return () => clearTimeout(timer);
	});

	async function resendEmails(listing: Listing) {
		const interest = listing.interest;
		if (!interest || resendBusyId) return;
		resendBusyId = listing.id;
		// Launching again only e-mails whoever is still pending; the API ignores the stock then.
		const result =
			interest.status === 'launched'
				? await launchMyListingInterest(fetch, listing.id, {
						stock_count: Math.max(1, listing.stock?.count ?? 1)
					})
				: await closeMyListingInterest(fetch, listing.id, {});
		resendBusyId = '';
		if (!result.ok) {
			setRowFeedback(listing.id, result.error.message, true);
			return;
		}
		setRowFeedback(listing.id, `Sending to ${result.data.pending} people now.`);
		pollsLeft = POLL_MAX;
		await invalidateAll();
	}

	async function submitLaunch(e: SubmitEvent) {
		e.preventDefault();
		const target = interestDialog;
		if (!target || dialogBusy) return;
		const units = Number(text(launchStock));
		if (!text(launchStock) || !Number.isInteger(units) || units < 1) {
			dialogError = 'Units in stock must be a whole number, 1 or more.';
			return;
		}
		const message = interestMessage.trim();
		await runNotify('launch', target, () =>
			launchMyListingInterest(fetch, target.id, {
				stock_count: units,
				...(message ? { message } : {})
			})
		);
	}

	async function submitClose(e: SubmitEvent) {
		e.preventDefault();
		const target = interestDialog;
		if (!target || dialogBusy) return;
		const message = interestMessage.trim();
		await runNotify('close', target, () =>
			closeMyListingInterest(fetch, target.id, message ? { message } : {})
		);
	}

	async function runNotify(
		kind: 'launch' | 'close',
		target: InterestDialog,
		call: () => ReturnType<typeof launchMyListingInterest>
	) {
		dialogBusy = true;
		dialogError = '';
		const result = await call();
		dialogBusy = false;
		if (!result.ok) {
			dialogError = result.error.message;
			return;
		}
		setRowFeedback(target.id, notifyResultText(kind, result.data));
		interestDialogOpen = false;
		pollsLeft = POLL_MAX;
		await invalidateAll();
	}
</script>

<SeoHead meta={{ title: 'Listings · Maker portal', noindex: true }} />

{#if !data.canSell}
	<section class="max-w-xl space-y-2">
		<h2 class="text-xl font-semibold">Listings</h2>
		<p class="text-sm text-muted-foreground">
			Selling products isn't enabled for your maker account. Write to
			<a href="mailto:support@selfcrafted.in" class="underline">support@selfcrafted.in</a> to add it.
		</p>
	</section>
{:else}
	<section class="space-y-8">
		<div>
			<h2 class="text-xl font-semibold">Listings</h2>
			<p class="mt-1 max-w-2xl text-sm text-muted-foreground">
				Stock, tags, guarantee and the text sections save straight away. Changing the name, price,
				photos or type of a live listing sends it back for review, and it is hidden from buyers
				until it is approved again.
			</p>
		</div>

		{#if data.error}
			<p class="text-sm text-destructive" role="alert">{data.error}</p>
		{/if}

		<form
			bind:this={formEl}
			class="scroll-mt-4 space-y-5 rounded-md border border-border p-4"
			onsubmit={onSubmit}>
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h3 class="text-base font-medium">
					{editing ? `Edit "${editing.name ?? 'listing'}"` : 'New listing'}
				</h3>
				{#if editing}
					<ScButton variant="ghost" onclick={cancelEdit}>Cancel edit</ScButton>
				{/if}
			</div>

			{#if formMessage}
				<p class="text-sm text-muted-foreground" role="status">{formMessage}</p>
			{/if}

			<div class="space-y-1.5">
				<label for={nameInputId} class="block text-sm font-medium">Name</label>
				<ScInput id={nameInputId} bind:value={name} required minlength={2} maxlength={200} />
			</div>

			<div class="grid gap-4 sm:grid-cols-3">
				<div class="space-y-1.5">
					<label for="listing-price" class="block text-sm font-medium"
						>{interestOn ? 'Expected price (₹)' : 'Price (₹)'}</label>
					<ScInput
						id="listing-price"
						bind:value={priceNew}
						type="number"
						min="1"
						step="1"
						inputmode="numeric"
						required
						aria-describedby="listing-price-help" />
					<p id="listing-price-help" class="text-xs text-muted-foreground">Whole rupees.</p>
				</div>
				<div class="space-y-1.5">
					<label for="listing-price-old" class="block text-sm font-medium"
						>Original price (₹), optional</label>
					<ScInput
						id="listing-price-old"
						bind:value={priceOld}
						type="number"
						min="0"
						step="1"
						inputmode="numeric"
						aria-describedby="listing-price-old-help" />
					<p id="listing-price-old-help" class="text-xs text-muted-foreground">
						Shown struck through next to the price. Leave empty for none.
					</p>
				</div>
				{#if !interestOn}
					<div class="space-y-1.5">
						<label for="listing-stock" class="block text-sm font-medium">Stock</label>
						<ScInput
							id="listing-stock"
							bind:value={stock}
							type="number"
							min="0"
							step="1"
							inputmode="numeric"
							required />
					</div>
				{/if}
			</div>

			{#if showInterestSection}
				<fieldset class="space-y-4 rounded-md border border-border p-3">
					<legend class="px-1 text-sm font-medium">Check interest before you make it</legend>
					<div class="space-y-1">
						<label class="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								bind:checked={interestEnabled}
								disabled={interestLocked}
								aria-describedby="listing-interest-help"
								class="size-4" />
							List this as an interest check
						</label>
						<p id="listing-interest-help" class="text-xs text-muted-foreground">
							Buyers see a Show interest button in place of Add to cart. Nobody pays until you
							launch.
						</p>
					</div>

					{#if interestOn}
						{#if interestLocked}
							<p class="text-sm text-muted-foreground" id="listing-interest-locked">
								{INTEREST_LOCKED_MESSAGE}
							</p>
						{/if}
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-1.5">
								<label for="listing-interest-target" class="block text-sm font-medium"
									>People you need</label>
								<ScInput
									id="listing-interest-target"
									bind:value={interestTarget}
									type="number"
									min={INTEREST_TARGET_MIN}
									max={INTEREST_TARGET_MAX}
									step="1"
									inputmode="numeric"
									required
									readonly={interestLocked}
									aria-describedby={interestLocked
										? 'listing-interest-target-help listing-interest-locked'
										: 'listing-interest-target-help'} />
								<p id="listing-interest-target-help" class="text-xs text-muted-foreground">
									You commit to producing it once this many people show interest.
								</p>
							</div>
							<div class="space-y-1.5">
								<label for="listing-interest-days" class="block text-sm font-medium"
									>Ships within (days)</label>
								<ScInput
									id="listing-interest-days"
									bind:value={interestDays}
									type="number"
									min={INTEREST_SHIP_DAYS_MIN}
									max={INTEREST_SHIP_DAYS_MAX}
									step="1"
									inputmode="numeric"
									required
									readonly={interestLocked}
									aria-describedby={interestLocked
										? 'listing-interest-days-help listing-interest-locked'
										: 'listing-interest-days-help'} />
								<p id="listing-interest-days-help" class="text-xs text-muted-foreground">
									Counted from the day you reach that number.
								</p>
							</div>
						</div>
						<div class="space-y-1.5">
							<label for="listing-interest-note" class="block text-sm font-medium"
								>Note for buyers (optional)</label>
							<textarea
								id="listing-interest-note"
								bind:value={interestNote}
								rows={2}
								maxlength={INTEREST_NOTE_MAX}
								aria-describedby="listing-interest-note-help"
								class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							></textarea>
							<p id="listing-interest-note-help" class="text-xs text-muted-foreground">
								One or two lines on what happens next. Plain text.
							</p>
						</div>
					{/if}
				</fieldset>
			{/if}

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-1.5">
					<label for="listing-type" class="block text-sm font-medium">Type</label>
					<select
						id="listing-type"
						bind:value={type}
						aria-describedby="listing-type-help"
						class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
						{#each TYPE_OPTIONS as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					<p id="listing-type-help" class="text-xs text-muted-foreground">
						Sets which section of Crafts the listing appears in.
					</p>
				</div>
				<div class="space-y-1.5">
					<label for="listing-tags" class="block text-sm font-medium">Tags</label>
					<ScInput
						id="listing-tags"
						bind:value={tagsText}
						placeholder="open hardware, kit, PLA"
						aria-describedby="listing-tags-help" />
					<p id="listing-tags-help" class="text-xs text-muted-foreground">
						Separate tags with commas.
					</p>
				</div>
			</div>

			<div class="space-y-1.5">
				<label for="listing-guarantee" class="block text-sm font-medium">Guarantee</label>
				<ScInput
					id="listing-guarantee"
					bind:value={guarantee}
					maxlength={500}
					placeholder="For example: 30 days of build support" />
			</div>

			<div class="space-y-1.5">
				<label for="listing-description" class="block text-sm font-medium">Description</label>
				<textarea
					id="listing-description"
					bind:value={description}
					rows={5}
					maxlength={20000}
					aria-describedby="listing-description-help"
					class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"></textarea>
				<p id="listing-description-help" class="text-xs text-muted-foreground">
					Shown on the product page. Line breaks and Markdown are kept.
				</p>
			</div>

			<div class="space-y-1.5">
				<label for="listing-docs" class="block text-sm font-medium">Documentation</label>
				<textarea
					id="listing-docs"
					bind:value={docs}
					rows={4}
					maxlength={50000}
					class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
					placeholder="Build notes, parts list, assembly steps"></textarea>
			</div>

			<div class="space-y-1.5">
				<label for="listing-costing" class="block text-sm font-medium">Public cost breakdown</label>
				<textarea
					id="listing-costing"
					bind:value={costing}
					rows={3}
					maxlength={50000}
					aria-describedby="listing-costing-help"
					class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"></textarea>
				<p id="listing-costing-help" class="text-xs text-muted-foreground">
					Buyers see this on the product page. Leave it empty to hide the tab.
				</p>
			</div>

			<div class="space-y-1.5">
				<label for="listing-shipping" class="block text-sm font-medium">Shipping</label>
				<textarea
					id="listing-shipping"
					bind:value={shipping}
					rows={3}
					maxlength={20000}
					aria-describedby="listing-shipping-help"
					class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
					placeholder="How and when you ship"></textarea>
				<p id="listing-shipping-help" class="text-xs text-muted-foreground">
					Line breaks and Markdown are kept.
				</p>
			</div>

			<div class="space-y-2">
				<p class="text-sm font-medium" id="listing-images-label">
					Images <span class="font-normal text-muted-foreground"
						>({images.length} of {MAX_IMAGES})</span>
				</p>
				{#if images.length}
					<ul class="flex flex-wrap gap-3">
						{#each images as img, index (img.url)}
							<li class="w-24 space-y-1">
								<div class="relative size-24 overflow-hidden rounded border border-border">
									<img
										src={img.url}
										alt={`Image ${index + 1}${index === 0 ? ', cover' : ''}`}
										class="h-full w-full object-cover" />
									{#if index === 0}
										<span class="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 text-xs"
											>Cover</span>
									{/if}
								</div>
								<div class="flex items-center justify-between">
									<button
										type="button"
										class="flex size-8 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
										aria-label={`Move image ${index + 1} left`}
										disabled={index === 0}
										onclick={() => moveImage(index, -1)}>
										<Icon icon={F.chevronLeft} class="size-4" aria-hidden="true" />
									</button>
									<button
										type="button"
										class="flex size-8 items-center justify-center rounded hover:bg-muted"
										aria-label={`Remove image ${index + 1}`}
										onclick={() => removeImage(index)}>
										<Icon icon={F.dismiss} class="size-4" aria-hidden="true" />
									</button>
									<button
										type="button"
										class="flex size-8 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
										aria-label={`Move image ${index + 1} right`}
										disabled={index === images.length - 1}
										onclick={() => moveImage(index, 1)}>
										<Icon icon={F.chevronRight} class="size-4" aria-hidden="true" />
									</button>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
				<ScButton
					variant="secondary"
					disabled={uploadStatus !== '' || images.length >= MAX_IMAGES}
					onclick={() => imageInput?.click()}>
					{uploadStatus || (images.length >= MAX_IMAGES ? 'Image limit reached' : 'Add images')}
				</ScButton>
				<input
					bind:this={imageInput}
					type="file"
					multiple
					accept={IMAGE_TYPES.join(',')}
					class="hidden"
					tabindex="-1"
					aria-labelledby="listing-images-label"
					onchange={onImagesSelected} />
				<p class="text-xs text-muted-foreground">
					Up to {MAX_IMAGES} images. JPG, PNG, WebP or GIF, up to 5 MB each. The first image is the cover.
				</p>
			</div>

			{#if materialChange}
				<p class="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="status">
					You changed the name, price, photos or type. Saving sends this listing back for review,
					and it is hidden from buyers until it is approved again.
				</p>
			{/if}

			{#if formError}
				<p class="text-sm text-destructive" role="alert">{formError}</p>
			{/if}

			<div class="flex flex-wrap items-center gap-3">
				{#if canSubmitForReview}
					<ScButton disabled={busy || uploadStatus !== ''} onclick={() => trySave(true)}>
						{busy ? 'Saving…' : 'Submit for review'}
					</ScButton>
					<ScButton
						variant="secondary"
						disabled={busy || uploadStatus !== ''}
						onclick={() => trySave(false)}>
						Save draft
					</ScButton>
				{:else}
					<ScButton disabled={busy || uploadStatus !== ''} onclick={() => trySave(false)}>
						{busy ? 'Saving…' : 'Save changes'}
					</ScButton>
				{/if}
			</div>
		</form>

		<div class="space-y-3">
			{#each listings as listing (listing.id)}
				{@const stockCount = String(listing.stock?.count ?? 0)}
				{@const state = listing.listing_state ?? ''}
				{@const canManage = state === 'live' || state === 'paused'}
				{@const rowBusy = stateBusyId === listing.id}
				{@const price = listing.price}
				{@const feedback = rowFeedback[listing.id]}
				{@const interest = listing.interest ?? null}
				{@const interestOpen = interest?.status === 'open'}
				{@const launchBlocked = interestOpen ? launchBlockedReason(listing) : ''}
				<div class="space-y-3 rounded-md border border-border p-3">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								{#if listing.images?.[0]?.url}
									<img src={listing.images[0].url} alt="" class="size-12 rounded object-cover" />
								{/if}
								<div>
									<p class="text-sm font-medium">{listing.name}</p>
									<p class="text-sm text-muted-foreground">
										{STATE_LABELS[state] ?? state} ·
										{TYPE_OPTIONS.find((option) => option.value === (listing.type ?? 'product'))
											?.label ?? listing.type}
									</p>
									{#if interest?.status === 'open'}
										<p class="text-sm">
											Interest check: {interest.interested_count} of {interest.target_count}
										</p>
									{:else if interest?.status === 'launched' && interest.launched_at}
										<p class="text-sm text-muted-foreground">
											Launched {formatDate(interest.launched_at)}
										</p>
									{:else if interest?.status === 'closed'}
										<p class="text-sm text-muted-foreground">
											Closed {formatDate(interest.closed_at)}
										</p>
									{/if}
									{#if interest && hasPending(listing)}
										<div class="mt-1 flex flex-wrap items-center gap-2">
											<p class="text-sm tabular-nums">
												{interest.interested_count - interest.pending_count} of {interest.interested_count}
												emailed
											</p>
											<ScButton
												variant="secondary"
												disabled={resendBusyId === listing.id}
												onclick={() => resendEmails(listing)}>
												Send remaining emails
											</ScButton>
										</div>
									{/if}
								</div>
							</div>
							{#if state === 'rejected'}
								<div class="mt-2 text-sm">
									{#if listing.review_notes}
										<p class="text-muted-foreground">Note from the reviewer:</p>
										<p class="whitespace-pre-line">{listing.review_notes}</p>
									{/if}
									<p class="mt-1 text-muted-foreground">
										Edit the listing and submit it for review again.
									</p>
								</div>
							{/if}
							{#if price}
								<p class="mt-2 text-sm">
									{#if price.old > 0 && price.old !== price.new}
										<span class="mr-2 text-muted-foreground line-through"
											>{formatInr(price.old)}</span>
									{/if}
									{formatInr(price.new)}
								</p>
							{/if}
							{#if listing.tags?.length}
								<div class="mt-2 flex flex-wrap gap-1">
									{#each listing.tags as tag (tag)}
										<span
											class="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground"
											>{tag}</span>
									{/each}
								</div>
							{/if}
							{#if listing.description}
								<p class="mt-2 line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>
							{/if}
						</div>
						<div class="flex flex-wrap items-center gap-2">
							{#if state !== 'archived' && !interestOpen}
								<label class="flex items-center gap-2 text-sm">
									<span class="text-muted-foreground">Stock</span>
									<input
										class="w-20 rounded border border-border bg-background px-2 py-1"
										type="number"
										min="0"
										step="1"
										value={stockCount}
										onchange={(e) => saveStock(listing, e.currentTarget as HTMLInputElement)} />
								</label>
							{/if}
							{#if state !== 'archived'}
								<ScButton variant="secondary" onclick={() => startEdit(listing)}>Edit</ScButton>
							{/if}
							{#if state === 'live'}
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- productPath builds the canonical product URL -->
								<a href={liveHref(listing)} class="text-sm underline" target="_blank" rel="noopener"
									>View live</a>
							{/if}
							{#if canManage}
								{#if state === 'live'}
									<ScButton
										variant="secondary"
										disabled={rowBusy}
										onclick={() => setState(listing, 'paused')}>
										{rowBusy ? 'Saving…' : 'Pause'}
									</ScButton>
								{:else}
									<ScButton
										variant="secondary"
										disabled={rowBusy}
										onclick={() => setState(listing, 'live')}>
										{rowBusy ? 'Saving…' : 'Resume'}
									</ScButton>
								{/if}
								<ScButton
									variant="ghost"
									disabled={rowBusy}
									onclick={() => setState(listing, 'archived')}>
									Archive
								</ScButton>
							{/if}
						</div>
					</div>
					{#if interestOpen}
						<div class="flex flex-wrap items-center gap-2">
							<ScButton
								variant="secondary"
								onclick={(e: MouseEvent) => openInterestDialog('view', listing, e)}
								>View interest</ScButton>
							<ScButton
								disabled={launchBlocked !== ''}
								onclick={(e: MouseEvent) => openInterestDialog('launch', listing, e)}
								>Launch</ScButton>
							<ScButton
								variant="ghost"
								onclick={(e: MouseEvent) => openInterestDialog('close', listing, e)}
								>Close</ScButton>
							{#if launchBlocked}
								<p class="text-xs text-muted-foreground">
									{launchBlocked}
								</p>
							{/if}
						</div>
					{/if}
					{#if feedback}
						<p
							class="text-sm {feedback.error ? 'text-destructive' : 'text-muted-foreground'}"
							role={feedback.error ? 'alert' : 'status'}>
							{feedback.text}
						</p>
					{/if}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No listings yet.</p>
			{/each}
		</div>
	</section>

	<Dialog.Root bind:open={interestDialogOpen}>
		<Dialog.Content
			class="max-h-[90vh] max-w-lg overflow-y-auto border-border bg-card text-card-foreground"
			onCloseAutoFocus={restoreFocus}>
			{#if interestDialog?.kind === 'view'}
				<Dialog.Header class="pr-6 text-left">
					<Dialog.Title class="text-lg font-semibold"
						>Interest in {interestDialog.name}</Dialog.Title>
					<Dialog.Description class="text-sm text-muted-foreground">
						{summary?.interestedCount ?? interestDialog.count} of {summary?.targetCount ??
							interestDialog.target} people
					</Dialog.Description>
				</Dialog.Header>
				{#if summaryLoading}
					<p class="text-sm text-muted-foreground" role="status">Loading…</p>
				{:else if dialogError}
					<p class="text-sm text-destructive" role="alert">{dialogError}</p>
				{:else if summary}
					{#if summary.byCity.length}
						<div class="space-y-2">
							<h3 class="text-sm font-medium" id="interest-where">Where they are</h3>
							<div class="overflow-x-auto rounded-md border border-border">
								<table class="w-full text-left text-sm" aria-labelledby="interest-where">
									<thead class="border-b border-border text-muted-foreground">
										<tr>
											<th scope="col" class="px-3 py-2 font-medium">City</th>
											<th scope="col" class="px-3 py-2 font-medium">State</th>
											<th scope="col" class="px-3 py-2 text-right font-medium">People</th>
										</tr>
									</thead>
									<tbody>
										{#each summary.byCity as row (`${row.city}|${row.state}`)}
											<tr class="border-b border-border last:border-b-0">
												<td class="px-3 py-2">{placeLabel(row.city)}</td>
												<td class="px-3 py-2">{row.city === '' ? '' : row.state}</td>
												<td class="px-3 py-2 text-right tabular-nums">{row.count}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">Nobody has shown interest yet.</p>
					{/if}
				{/if}
				<p class="text-xs text-muted-foreground">
					You see counts only, and places with fewer than 3 people are grouped together. Selfcrafted
					holds the names, addresses and phone numbers, and sends the emails.
				</p>
			{:else if interestDialog?.kind === 'launch'}
				<form class="space-y-4" onsubmit={submitLaunch}>
					<Dialog.Header class="pr-6 text-left">
						<Dialog.Title class="text-lg font-semibold">Launch {interestDialog.name}</Dialog.Title>
						<Dialog.Description class="text-sm text-muted-foreground">
							This turns the listing into a normal one that people can buy, and emails everyone on
							the list a link.
						</Dialog.Description>
					</Dialog.Header>
					<div class="space-y-1.5">
						<label for="interest-launch-stock" class="block text-sm font-medium"
							>Units in stock</label>
						<ScInput
							id="interest-launch-stock"
							bind:value={launchStock}
							type="number"
							min="1"
							step="1"
							inputmode="numeric"
							required />
					</div>
					<div class="space-y-1.5">
						<label for="interest-launch-message" class="block text-sm font-medium"
							>Message to include (optional)</label>
						<textarea
							id="interest-launch-message"
							bind:value={interestMessage}
							rows={3}
							maxlength={INTEREST_LAUNCH_MESSAGE_MAX}
							class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						></textarea>
					</div>
					{#if dialogError}
						<p class="text-sm text-destructive" role="alert">{dialogError}</p>
					{/if}
					<Dialog.Footer class="gap-2">
						<ScButton variant="secondary" onclick={() => (interestDialogOpen = false)}
							>Not yet</ScButton>
						<ScButton type="submit" disabled={dialogBusy}>
							{dialogBusy
								? 'Launching…'
								: interestDialog.count > 0
									? `Launch and email ${interestDialog.count} people`
									: 'Launch'}
						</ScButton>
					</Dialog.Footer>
				</form>
			{:else if interestDialog?.kind === 'close'}
				<form class="space-y-4" onsubmit={submitClose}>
					<Dialog.Header class="pr-6 text-left">
						<Dialog.Title class="text-lg font-semibold">Close this interest check</Dialog.Title>
						<Dialog.Description class="text-sm text-muted-foreground">
							Use this if you've decided not to make it. Everyone on the list gets an email saying
							so. This can't be undone.
						</Dialog.Description>
					</Dialog.Header>
					<div class="space-y-1.5">
						<label for="interest-close-message" class="block text-sm font-medium"
							>Message to include (optional)</label>
						<textarea
							id="interest-close-message"
							bind:value={interestMessage}
							rows={3}
							maxlength={INTEREST_LAUNCH_MESSAGE_MAX}
							class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						></textarea>
					</div>
					{#if dialogError}
						<p class="text-sm text-destructive" role="alert">{dialogError}</p>
					{/if}
					<Dialog.Footer class="gap-2">
						<ScButton variant="secondary" onclick={() => (interestDialogOpen = false)}
							>Keep it open</ScButton>
						<ScButton type="submit" disabled={dialogBusy}>
							{dialogBusy
								? 'Closing…'
								: interestDialog.count > 0
									? `Close and email ${interestDialog.count} people`
									: 'Close'}
						</ScButton>
					</Dialog.Footer>
				</form>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
{/if}
