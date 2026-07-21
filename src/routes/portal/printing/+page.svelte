<script lang="ts">
	import ApprovedMakerPortal from '$lib/components/maker/ApprovedMakerPortal.svelte';
	import { SeoHead } from '$lib/components/seo';

	let { data } = $props();
</script>

<SeoHead meta={{ title: 'Printing · Portal', noindex: true }} />

<section class="space-y-4">
	<div>
		<h2 class="text-xl font-semibold">3D printing</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Filament inventory and print requests. Detailed request threads still open under the print
			portal.
		</p>
	</div>

	{#if data.printingApproved && data.supabase && data.session}
		<ApprovedMakerPortal
			supabase={data.supabase}
			session={data.session}
			makerName={data.makerName ?? undefined} />
	{:else}
		<div class="rounded-md border border-border p-4 text-sm text-muted-foreground">
			Your printing capability is approved in maker profile, but the PrintingCrafters shim row is
			not ready yet. Finish 3DP profile setup from staff tooling or re-apply with printing selected.
		</div>
	{/if}
</section>
