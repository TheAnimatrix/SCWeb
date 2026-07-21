<script lang="ts">
	import { SeoHead } from '$lib/components/seo';

	let { data } = $props();
</script>

<SeoHead meta={{ title: 'Maker Portal', noindex: true }} />

<section class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Dashboard</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Manage your storefront, listings, and {data.maker.capabilities?.includes('printing_3d')
				? 'print queue'
				: 'shop'}.
		</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		<a href="/portal/storefront" class="rounded-md border border-border p-4 hover:border-foreground/30">
			<p class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Storefront</p>
			<p class="mt-2 text-sm font-medium capitalize">{data.maker.storefront_state}</p>
		</a>
		<a href="/portal/listings" class="rounded-md border border-border p-4 hover:border-foreground/30">
			<p class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Listings</p>
			<p class="mt-2 text-sm font-medium">Create & stock</p>
		</a>
		{#if data.maker.capabilities?.includes('printing_3d')}
			<a href="/portal/printing" class="rounded-md border border-border p-4 hover:border-foreground/30">
				<p class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Printing</p>
				<p class="mt-2 text-sm font-medium">3DP controls</p>
			</a>
		{/if}
	</div>
</section>
