<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';
	import { SeoHead } from '$lib/components/seo';

	let { data } = $props();

	const sells = $derived(data.maker.capabilities?.includes('physical_goods') ?? false);
	const prints = $derived(data.maker.capabilities?.includes('printing_3d') ?? false);
	const summary = $derived(data.listingSummary);
	const shopLive = $derived(data.maker.storefront_state === 'live');

	const shopStateText = $derived(
		{
			live: 'Live, visible to buyers.',
			draft: 'Draft, hidden from buyers.',
			paused: 'Paused, hidden from buyers.',
			suspended: 'Suspended by Selfcrafted, hidden from buyers.'
		}[data.maker.storefront_state] ?? 'Hidden from buyers.'
	);

	const steps = $derived(
		[
			{
				label: 'Publish your shop page',
				done: shopLive,
				href: '/portal/storefront',
				show: true
			},
			{
				label: 'Add your first listing',
				done: (summary?.total ?? 0) > 0,
				href: '/portal/listings',
				show: sells && summary !== null
			},
			{
				label: 'Get a listing approved so buyers can see it',
				done: (summary?.live ?? 0) > 0,
				href: '/portal/listings',
				show: sells && summary !== null
			}
		].filter((step) => step.show)
	);
	const allDone = $derived(steps.every((step) => step.done));
</script>

<SeoHead meta={{ title: 'Maker portal', noindex: true }} />

<section class="space-y-8">
	<div>
		<h2 class="text-xl font-semibold">Dashboard</h2>
	</div>

	{#if !allDone}
		<div class="rounded-md border border-border p-4">
			<h3 class="text-base font-medium">Getting started</h3>
			<ol class="mt-3 space-y-2">
				{#each steps as step (step.label)}
					<li class="flex items-center gap-2 text-sm">
						<Icon
							icon={step.done ? F.checkCircle : F.circle}
							class="size-4 shrink-0 {step.done ? 'text-emerald-600' : 'text-muted-foreground'}"
							aria-hidden="true" />
						{#if step.done}
							<span class="text-muted-foreground line-through">{step.label}</span>
							<span class="sr-only">(done)</span>
						{:else}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- static portal paths -->
							<a href={step.href} class="underline">{step.label}</a>
						{/if}
					</li>
				{/each}
			</ol>
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-3">
		<a
			href={resolve('/portal/storefront')}
			class="rounded-md border border-border p-4 hover:border-foreground/30">
			<p class="text-sm font-medium">Shop page</p>
			<p class="mt-2 text-sm text-muted-foreground">{shopStateText}</p>
		</a>
		{#if sells}
			<a
				href={resolve('/portal/listings')}
				class="rounded-md border border-border p-4 hover:border-foreground/30">
				<p class="text-sm font-medium">Listings</p>
				{#if summary}
					<ul class="mt-2 space-y-0.5 text-sm text-muted-foreground">
						<li>{summary.live} live</li>
						<li>{summary.inReview} in review</li>
						{#if summary.drafts > 0}<li>{summary.drafts} drafts</li>{/if}
						{#if summary.rejected > 0}<li>{summary.rejected} not approved</li>{/if}
					</ul>
				{:else}
					<p class="mt-2 text-sm text-muted-foreground">Add and manage your products.</p>
				{/if}
			</a>
		{/if}
		{#if prints}
			<a
				href={resolve('/portal/printing')}
				class="rounded-md border border-border p-4 hover:border-foreground/30">
				<p class="text-sm font-medium">3D printing</p>
				<p class="mt-2 text-sm text-muted-foreground">Print requests and filaments.</p>
			</a>
		{/if}
	</div>
</section>
