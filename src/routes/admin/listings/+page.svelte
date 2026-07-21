<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { reviewListing } from '$lib/client/makersApi';
	import { ScButton } from '$lib/components/sc';
	import { SeoHead } from '$lib/components/seo';

	let { data } = $props();
	let busyId = $state('');

	async function review(id: string, decision: 'live' | 'rejected') {
		busyId = id;
		await reviewListing(fetch, id, decision);
		busyId = '';
		await invalidateAll();
	}
</script>

<SeoHead meta={{ title: 'Admin · Listings', noindex: true }} />

<div class="mx-auto max-w-4xl px-4 py-8">
	<h1 class="text-2xl font-semibold">Listing review queue</h1>
	<p class="mt-1 text-sm text-muted-foreground">Approve listings to go live on the marketplace.</p>

	{#if data.error}
		<p class="mt-4 text-sm text-destructive">{data.error}</p>
	{/if}

	<div class="mt-6 space-y-3">
		{#each data.listings as listing (listing.id)}
			<div class="rounded-md border border-border p-4">
				<p class="font-medium">{listing.name}</p>
				<p class="font-mono text-xs text-muted-foreground">
					{listing.username || listing.display_name || listing.maker_id}
				</p>
				<div class="mt-3 flex gap-2">
					<ScButton
						disabled={busyId === listing.id}
						onclick={() => review(String(listing.id), 'live')}>Publish</ScButton>
					<ScButton
						variant="secondary"
						disabled={busyId === listing.id}
						onclick={() => review(String(listing.id), 'rejected')}>Reject</ScButton>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No listings pending review.</p>
		{/each}
	</div>
</div>
