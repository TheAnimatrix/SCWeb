<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { reviewListing } from '$lib/client/makersApi';
	import { ScButton } from '$lib/components/sc';
	import { SeoHead } from '$lib/components/seo';
	import { formatDate, formatInr } from '$lib/utils/format';

	let { data } = $props();
	let busyId = $state('');
	let notes = $state<Record<string, string>>({});
	let feedback = $state<{ text: string; error: boolean } | null>(null);

	const TYPE_LABELS: Record<string, string> = {
		product: 'Product',
		spare: 'Spare part',
		'flea-market': 'Flea market'
	};

	type PendingListing = {
		id: string;
		name: string | null;
		price: { new: number; old: number } | null;
		stock: { count: number } | null;
		images: { url: string }[] | null;
		type: string | null;
		description?: string | null;
		username: string | null;
		display_name: string | null;
		maker_id: string | null;
		created_at: string | null;
	};

	const listings = $derived((data.listings ?? []) as PendingListing[]);

	async function review(listing: PendingListing, decision: 'live' | 'rejected') {
		const label = listing.name ?? 'this listing';
		const note = (notes[listing.id] ?? '').trim();
		if (
			decision === 'rejected' &&
			!confirm(
				note
					? `Reject "${label}"? The maker will see your note.`
					: `Reject "${label}" without a note? The maker will not see a reason.`
			)
		) {
			return;
		}
		busyId = listing.id;
		feedback = null;
		const result = await reviewListing(fetch, listing.id, decision, note || undefined);
		busyId = '';
		if (!result.ok) {
			feedback = {
				text: `Could not save the decision for "${label}". ${result.error.message}`,
				error: true
			};
			return;
		}
		feedback = {
			text: decision === 'live' ? `"${label}" is now live.` : `"${label}" was rejected.`,
			error: false
		};
		await invalidateAll();
	}
</script>

<SeoHead meta={{ title: 'Admin · Listings', noindex: true }} />

<div class="mx-auto max-w-4xl px-4 py-8">
	<h1 class="text-2xl font-semibold">Listing review queue</h1>
	<p class="mt-1 text-sm text-muted-foreground">
		Check the name, price, photos and type. Stock and text sections do not need review.
	</p>

	{#if data.error}
		<p class="mt-4 text-sm text-destructive" role="alert">{data.error}</p>
	{/if}
	{#if feedback}
		<p
			class="mt-4 text-sm {feedback.error ? 'text-destructive' : 'text-muted-foreground'}"
			role={feedback.error ? 'alert' : 'status'}>
			{feedback.text}
		</p>
	{/if}

	<div class="mt-6 space-y-4">
		{#each listings as listing (listing.id)}
			<div class="space-y-3 rounded-md border border-border p-4">
				<div>
					<p class="font-medium">{listing.name}</p>
					<p class="text-sm text-muted-foreground">
						{listing.display_name || 'Unnamed maker'}
						{#if listing.username}(@{listing.username}){/if}
						· {TYPE_LABELS[listing.type ?? 'product'] ?? listing.type}
						{#if listing.created_at}· Created {formatDate(listing.created_at)}{/if}
					</p>
				</div>

				{#if listing.images?.length}
					<ul class="flex flex-wrap gap-2">
						{#each listing.images as img, index (img.url)}
							<li>
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- full-size image on the storage host -->
								<a href={img.url} target="_blank" rel="noopener noreferrer">
									<img
										src={img.url}
										alt={`${listing.name ?? 'Listing'} image ${index + 1}`}
										class="size-24 rounded border border-border object-cover" />
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-muted-foreground">No images.</p>
				{/if}

				<p class="text-sm">
					{#if listing.price}
						{formatInr(listing.price.new)}
						{#if listing.price.old > 0 && listing.price.old !== listing.price.new}
							<span class="ml-1 text-muted-foreground line-through"
								>{formatInr(listing.price.old)}</span>
						{/if}
					{:else}
						No price
					{/if}
					· Stock {listing.stock?.count ?? 0}
				</p>

				{#if listing.description}
					<p class="line-clamp-6 whitespace-pre-line text-sm text-muted-foreground">
						{listing.description}
					</p>
				{/if}

				<div class="space-y-1.5">
					<label for={`notes-${listing.id}`} class="block text-sm font-medium"
						>Note to the maker (optional)</label>
					<textarea
						id={`notes-${listing.id}`}
						rows={2}
						maxlength={2000}
						value={notes[listing.id] ?? ''}
						oninput={(e) =>
							(notes = { ...notes, [listing.id]: (e.currentTarget as HTMLTextAreaElement).value })}
						class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
					></textarea>
					<p class="text-xs text-muted-foreground">Shown to the maker if you reject.</p>
				</div>

				<div class="flex flex-wrap gap-2">
					<ScButton disabled={busyId === listing.id} onclick={() => review(listing, 'live')}
						>Publish</ScButton>
					<ScButton
						variant="secondary"
						disabled={busyId === listing.id}
						onclick={() => review(listing, 'rejected')}>Reject</ScButton>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No listings pending review.</p>
		{/each}
	</div>
</div>
