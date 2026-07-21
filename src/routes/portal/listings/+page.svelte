<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { setMyListingState, updateListingStock, upsertMyListing } from '$lib/client/makersApi';
	import { ScButton, ScInput } from '$lib/components/sc';
	import { SeoHead } from '$lib/components/seo';

	let { data } = $props();

	let name = $state('');
	let price = $state('0');
	let stock = $state('1');
	let submitReview = $state(true);
	let busy = $state(false);
	let stateBusyId = $state('');
	let message = $state('');

	async function createListing(e: Event) {
		e.preventDefault();
		busy = true;
		message = '';
		const result = await upsertMyListing(fetch, {
			name,
			price_new: Number(price) || 0,
			stock_count: Number(stock) || 0,
			submit_for_review: submitReview
		});
		busy = false;
		if (!result.ok) {
			message = result.error.message;
			return;
		}
		name = '';
		price = '0';
		stock = '1';
		message = submitReview ? 'Submitted for review.' : 'Draft saved.';
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
</script>

<SeoHead meta={{ title: 'Listings · Portal', noindex: true }} />

<section class="space-y-8">
	<div>
		<h2 class="text-xl font-semibold">Listings</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Create drafts, submit for review, and adjust stock. Only approved listings go live.
		</p>
		<p class="mt-2 text-sm text-muted-foreground">
			Stock and other details can be updated without re-review. Changing name, price, or images
			requires review again.
		</p>
	</div>

	{#if data.error}
		<p class="text-sm text-destructive">{data.error}</p>
	{/if}

	{#if message}
		<p class="text-sm text-muted-foreground">{message}</p>
	{/if}

	<form class="space-y-3 rounded-md border border-border p-4" onsubmit={createListing}>
		<h3 class="text-sm font-medium">New listing</h3>
		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Name</span>
			<ScInput bind:value={name} required />
		</label>
		<div class="grid gap-3 sm:grid-cols-2">
			<label class="block space-y-1">
				<span class="font-mono text-[10px] uppercase text-muted-foreground">Price (₹)</span>
				<ScInput bind:value={price} type="number" min="0" required />
			</label>
			<label class="block space-y-1">
				<span class="font-mono text-[10px] uppercase text-muted-foreground">Stock</span>
				<ScInput bind:value={stock} type="number" min="0" required />
			</label>
		</div>
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" bind:checked={submitReview} />
			Submit for review immediately
		</label>
		<ScButton type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save listing'}</ScButton>
	</form>

	<div class="space-y-3">
		{#each data.listings as listing (listing.id)}
			{@const stockCount =
				typeof listing.stock === 'object' &&
				listing.stock &&
				'count' in (listing.stock as object)
					? String((listing.stock as { count: number }).count)
					: '0'}
			{@const state = String(listing.listing_state ?? '')}
			{@const canManage = state === 'live' || state === 'paused'}
			{@const rowBusy = stateBusyId === String(listing.id)}
			<div class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
				<div>
					<p class="text-sm font-medium">{listing.name}</p>
					<p class="font-mono text-[10px] uppercase text-muted-foreground">
						{listing.listing_state}
					</p>
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
								saveStock(String(listing.id), (e.currentTarget as HTMLInputElement).value)} />
					</label>
					{#if canManage}
						{#if state === 'live'}
							<ScButton
								variant="secondary"
								disabled={rowBusy}
								onclick={() => setState(String(listing.id), 'paused')}>
								{rowBusy ? '…' : 'Pause'}
							</ScButton>
						{:else}
							<ScButton
								variant="secondary"
								disabled={rowBusy}
								onclick={() => setState(String(listing.id), 'live')}>
								{rowBusy ? '…' : 'Resume'}
							</ScButton>
						{/if}
						<ScButton
							variant="ghost"
							disabled={rowBusy}
							onclick={() => setState(String(listing.id), 'archived')}>
							Archive
						</ScButton>
					{/if}
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No listings yet.</p>
		{/each}
	</div>
</section>
