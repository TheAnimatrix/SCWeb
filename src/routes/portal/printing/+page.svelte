<script lang="ts">
	import ApprovedMakerPortal from '$lib/components/maker/ApprovedMakerPortal.svelte';
	import { SeoHead } from '$lib/components/seo';
	import { Skeleton } from '$lib/components/sc';
	import { SUPPORT_EMAIL } from '$lib/seo/site';

	let { data } = $props();

	// The browser Supabase client is null during server rendering, so the portal
	// (which queries Supabase as it renders) only mounts in the browser.
	const browserSupabase = $derived(data.supabase);
</script>

<SeoHead meta={{ title: '3D printing · Maker portal', noindex: true }} />

<section class="space-y-4">
	<div>
		<h2 class="text-xl font-semibold">3D printing</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Your filaments and the print requests customers send you.
		</p>
	</div>

	{#if !data.hasPrintingCapability}
		<div class="rounded-md border border-border p-4 text-sm text-muted-foreground">
			Your maker account doesn't offer 3D printing yet. To add it, write to
			<a class="text-foreground underline" href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a>.
		</div>
	{:else if !data.printingApproved || !data.session}
		<div class="rounded-md border border-border p-4 text-sm text-muted-foreground">
			Your printing profile isn't set up yet. Write to
			<a class="text-foreground underline" href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a> and we'll
			finish it for you.
		</div>
	{:else if browserSupabase}
		<ApprovedMakerPortal
			supabase={browserSupabase}
			session={data.session}
			makerName={data.makerName ?? undefined} />
	{:else}
		<div class="space-y-4" aria-hidden="true">
			<Skeleton class="h-24 w-full rounded-lg" />
			<Skeleton class="h-64 w-full rounded-lg" />
		</div>
	{/if}
</section>
