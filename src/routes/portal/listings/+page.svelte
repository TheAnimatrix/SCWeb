<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		setMyListingState,
		updateListingStock,
		uploadMakerAsset,
		upsertMyListing
	} from '$lib/client/makersApi';
	import { ScButton, ScInput } from '$lib/components/sc';
	import { SeoHead } from '$lib/components/seo';

	let { data } = $props();

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
	};

	const listings = $derived((data.listings ?? []) as Listing[]);

	let editingId = $state<string | null>(null);
	let name = $state('');
	let priceNew = $state('0');
	let priceOld = $state('0');
	let stock = $state('1');
	let type = $state('product');
	let tagsText = $state('');
	let guarantee = $state('');
	let description = $state('');
	let docs = $state('');
	let costing = $state('');
	let shipping = $state('');
	let images = $state<{ url: string }[]>([]);
	let submitReview = $state(true);
	let busy = $state(false);
	let uploadBusy = $state(false);
	let stateBusyId = $state('');
	let message = $state('');

	function resetForm() {
		editingId = null;
		name = '';
		priceNew = '0';
		priceOld = '0';
		stock = '1';
		type = 'product';
		tagsText = '';
		guarantee = '';
		description = '';
		docs = '';
		costing = '';
		shipping = '';
		images = [];
		submitReview = true;
	}

	function startEdit(listing: Listing) {
		editingId = listing.id;
		name = listing.name ?? '';
		priceNew = String(listing.price?.new ?? 0);
		priceOld = String(listing.price?.old ?? listing.price?.new ?? 0);
		stock = String(listing.stock?.count ?? 0);
		type = listing.type ?? 'product';
		tagsText = (listing.tags ?? []).join(', ');
		guarantee = listing.guarantee ?? '';
		description = listing.description ?? '';
		docs = listing.docs ?? '';
		costing = listing.costing ?? '';
		shipping = listing.shipping ?? '';
		images = [...(listing.images ?? [])];
		submitReview = false;
		message = '';
	}

	function parseTags(value: string): string[] {
		return value
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
	}

	async function saveListing(e: Event) {
		e.preventDefault();
		busy = true;
		message = '';
		const result = await upsertMyListing(fetch, {
			product_id: editingId ?? undefined,
			name,
			price_new: Number(priceNew) || 0,
			price_old: Number(priceOld) || 0,
			stock_count: Number(stock) || 0,
			type,
			tags: parseTags(tagsText),
			images,
			guarantee: guarantee || null,
			description,
			docs,
			costing,
			shipping,
			submit_for_review: submitReview
		});
		busy = false;
		if (!result.ok) {
			message = result.error.message;
			return;
		}
		const state = (result.data.listing as { listing_state?: string })?.listing_state;
		message =
			state === 'pending_review'
				? 'Saved and queued for review (name/price/images/type changes).'
				: editingId
					? 'Listing updated.'
					: submitReview
						? 'Submitted for review.'
						: 'Draft saved.';
		resetForm();
		await invalidateAll();
	}

	async function saveStock(productId: string, value: string) {
		const count = Number(value);
		if (Number.isNaN(count) || count < 0) return;
		await updateListingStock(fetch, productId, count);
		await invalidateAll();
	}

	async function setState(productId: string, state: 'paused' | 'live' | 'archived') {
		stateBusyId = productId;
		message = '';
		const result = await setMyListingState(fetch, productId, state);
		stateBusyId = '';
		if (!result.ok) {
			message = result.error.message;
			return;
		}
		message =
			state === 'paused'
				? 'Listing paused.'
				: state === 'live'
					? 'Listing resumed.'
					: 'Listing archived.';
		await invalidateAll();
	}

	async function onImageSelected(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		uploadBusy = true;
		message = '';
		const result = await uploadMakerAsset(fetch, file, 'listing');
		uploadBusy = false;
		if (!result.ok) {
			message = result.error.message;
			return;
		}
		images = [...images, { url: result.data.url }];
	}

	function removeImage(url: string) {
		images = images.filter((img) => img.url !== url);
	}
</script>

<SeoHead meta={{ title: 'Listings · Portal', noindex: true }} />

<section class="space-y-8">
	<div>
		<h2 class="text-xl font-semibold">Listings</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Full product fields for your storefront. Stock, tags, description, docs, costing, and
			shipping update without re-review. Name, prices, images, and type re-queue review when
			changed on a live listing.
		</p>
	</div>

	{#if data.error}
		<p class="text-sm text-destructive">{data.error}</p>
	{/if}

	{#if message}
		<p class="text-sm text-muted-foreground">{message}</p>
	{/if}

	<form class="space-y-4 rounded-md border border-border p-4" onsubmit={saveListing}>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h3 class="text-sm font-medium">{editingId ? 'Edit listing' : 'New listing'}</h3>
			{#if editingId}
				<ScButton type="button" variant="ghost" onclick={resetForm}>Cancel edit</ScButton>
			{/if}
		</div>

		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Name</span>
			<ScInput bind:value={name} required />
		</label>

		<div class="grid gap-3 sm:grid-cols-3">
			<label class="block space-y-1">
				<span class="font-mono text-[10px] uppercase text-muted-foreground">New price (₹)</span>
				<ScInput bind:value={priceNew} type="number" min="0" required />
			</label>
			<label class="block space-y-1">
				<span class="font-mono text-[10px] uppercase text-muted-foreground">Old price (₹)</span>
				<ScInput bind:value={priceOld} type="number" min="0" />
			</label>
			<label class="block space-y-1">
				<span class="font-mono text-[10px] uppercase text-muted-foreground">Stock</span>
				<ScInput bind:value={stock} type="number" min="0" required />
			</label>
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<label class="block space-y-1">
				<span class="font-mono text-[10px] uppercase text-muted-foreground">Type</span>
				<select
					bind:value={type}
					class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
					<option value="product">product</option>
					<option value="spare">spare</option>
					<option value="flea-market">flea-market</option>
				</select>
			</label>
			<label class="block space-y-1">
				<span class="font-mono text-[10px] uppercase text-muted-foreground"
					>Tags (comma-separated)</span
				>
				<ScInput bind:value={tagsText} placeholder="open hardware, kit, PLA" />
			</label>
		</div>

		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Guarantee</span>
			<ScInput bind:value={guarantee} placeholder="e.g. 30-day support" />
		</label>

		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Description</span>
			<textarea
				bind:value={description}
				rows={4}
				class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
				placeholder="Short product description shown on the item page"></textarea>
		</label>

		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Documentation</span>
			<textarea
				bind:value={docs}
				rows={4}
				class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
				placeholder="Build notes, BOM, assembly docs"></textarea>
		</label>

		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Costing</span>
			<textarea
				bind:value={costing}
				rows={3}
				class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
				placeholder="Cost breakdown / margin notes"></textarea>
		</label>

		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Shipping</span>
			<textarea
				bind:value={shipping}
				rows={2}
				class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
				placeholder="Shipping policy"></textarea>
		</label>

		<div class="space-y-2">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Images</span>
			{#if images.length}
				<div class="flex flex-wrap gap-2">
					{#each images as img (img.url)}
						<div class="relative size-20 overflow-hidden rounded border border-border">
							<img src={img.url} alt="" class="h-full w-full object-cover" />
							<button
								type="button"
								class="absolute right-0.5 top-0.5 rounded bg-background/90 px-1 text-xs"
								onclick={() => removeImage(img.url)}>
								×
							</button>
						</div>
					{/each}
				</div>
			{/if}
			<label class="inline-flex cursor-pointer items-center gap-2 text-sm">
				<span
					class="rounded-md border border-border px-3 py-1.5 {uploadBusy
						? 'opacity-60'
						: 'hover:bg-muted'}">{uploadBusy ? 'Uploading…' : 'Upload image'}</span
				>
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp,image/gif"
					class="hidden"
					disabled={uploadBusy}
					onchange={onImageSelected} />
			</label>
		</div>

		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" bind:checked={submitReview} />
			Submit for review
			{#if editingId}
				<span class="text-muted-foreground">(also auto-queues if name/price/images/type change)</span>
			{/if}
		</label>

		<ScButton type="submit" disabled={busy}
			>{busy ? 'Saving…' : editingId ? 'Update listing' : 'Save listing'}</ScButton
		>
	</form>

	<div class="space-y-3">
		{#each listings as listing (listing.id)}
			{@const stockCount = String(listing.stock?.count ?? 0)}
			{@const state = listing.listing_state ?? ''}
			{@const canManage = state === 'live' || state === 'paused'}
			{@const rowBusy = stateBusyId === listing.id}
			{@const price = listing.price}
			<div class="space-y-3 rounded-md border border-border p-3">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							{#if listing.images?.[0]?.url}
								<img
									src={listing.images[0].url}
									alt=""
									class="size-12 rounded object-cover" />
							{/if}
							<div>
								<p class="text-sm font-medium">{listing.name}</p>
								<p class="font-mono text-[10px] uppercase text-muted-foreground">
									{listing.listing_state} · {listing.type ?? 'product'}
								</p>
							</div>
						</div>
						{#if price}
							<p class="mt-2 font-mono text-sm">
								{#if price.old > 0 && price.old !== price.new}
									<span class="mr-2 text-muted-foreground line-through">₹{price.old}</span>
								{/if}
								₹{price.new}
							</p>
						{/if}
						{#if listing.tags?.length}
							<div class="mt-2 flex flex-wrap gap-1">
								{#each listing.tags as tag (tag)}
									<span
										class="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground"
										>{tag}</span
									>
								{/each}
							</div>
						{/if}
						{#if listing.description}
							<p class="mt-2 line-clamp-2 text-xs text-muted-foreground">{listing.description}</p>
						{/if}
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<label class="flex items-center gap-2 text-sm">
							<span class="text-muted-foreground">Stock</span>
							<input
								class="w-20 rounded border border-border bg-background px-2 py-1"
								type="number"
								min="0"
								value={stockCount}
								onchange={(e) =>
									saveStock(listing.id, (e.currentTarget as HTMLInputElement).value)} />
						</label>
						<ScButton variant="secondary" onclick={() => startEdit(listing)}>Edit</ScButton>
						{#if canManage}
							{#if state === 'live'}
								<ScButton
									variant="secondary"
									disabled={rowBusy}
									onclick={() => setState(listing.id, 'paused')}>
									{rowBusy ? '…' : 'Pause'}
								</ScButton>
							{:else}
								<ScButton
									variant="secondary"
									disabled={rowBusy}
									onclick={() => setState(listing.id, 'live')}>
									{rowBusy ? '…' : 'Resume'}
								</ScButton>
							{/if}
							<ScButton
								variant="ghost"
								disabled={rowBusy}
								onclick={() => setState(listing.id, 'archived')}>
								Archive
							</ScButton>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No listings yet.</p>
		{/each}
	</div>
</section>
