<script lang="ts">
	import Icon from '@iconify/svelte';
	import { tick } from 'svelte';
	import { beforeNavigate, invalidateAll } from '$app/navigation';
	import {
		setMyListingState,
		updateListingStock,
		uploadMakerAsset,
		upsertMyListing
	} from '$lib/client/makersApi';
	import { ScButton, ScInput } from '$lib/components/sc';
	import { SeoHead } from '$lib/components/seo';
	import { F } from '$lib/icons/fluent';
	import { productPath } from '$lib/seo/product';
	import { formatInr } from '$lib/utils/format';

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
			images
		});
	}

	baseline = snapshot();

	const dirty = $derived(snapshot() !== baseline);
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
		const count = Number(text(stock));
		if (!text(stock) || !Number.isInteger(count) || count < 0)
			return 'Stock must be a whole number, 0 or more.';
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
			stock_count: Number(text(stock)),
			type,
			tags: parseTags(tagsText),
			images,
			guarantee: guarantee.trim() || null,
			description,
			docs,
			costing,
			shipping,
			submit_for_review: submitForReview
		});
		busy = false;
		if (!result.ok) {
			formError = result.error.message;
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
					<label for="listing-price" class="block text-sm font-medium">Price (₹)</label>
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
			</div>

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
							{#if state !== 'archived'}
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
{/if}
