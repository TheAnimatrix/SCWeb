<script lang="ts">
	import { browser } from '$app/environment';
	import HTMLWrapper from '$lib/components/fundamental/HTMLWrapper.svelte';
	import { ProseSkeleton } from '$lib/components/sc';
	import MobileExpandable from '$lib/components/sc/MobileExpandable.svelte';
	import { renderCostingMarkdown, renderUserContent } from '$lib/utils/markdown';
	import * as Accordion from '$lib/components/ui/accordion';
	import * as Tabs from '$lib/components/ui/tabs';
	import TabPanelTransition from '$lib/components/ui/TabPanelTransition.svelte';
	import { cn } from '$lib/utils';
	import ProductReviews from './ProductReviews.svelte';
	import type { Product } from '$lib/types/product';
	import type { SupabaseClient } from '@supabase/supabase-js';

	function loadRemoteHtml(url: string): Promise<string> | null {
		if (!browser) return null;

		return fetch(url).then(async (response) => {
			if (!response.ok) throw new Error(`Failed to fetch remote documentation: ${response.status}`);
			return response.text();
		});
	}

	type TabId = 'description' | 'shipping' | 'docs' | 'reviews';

	interface Review {
		id: string;
		user_id: string;
		rating: number;
		comment: string;
		created_at: string;
		users?: { username?: string; tier?: string };
	}

	interface Props {
		product: Product;
		reviews?: Review[];
		initialReviews?: Review[];
		/** Set when the reviews call failed, so "no reviews" isn't shown for an outage. */
		reviewsError?: string | null;
		supabase: SupabaseClient | null;
		class?: string;
	}

	let {
		product,
		reviews = $bindable([]),
		initialReviews = [],
		reviewsError = null,
		supabase,
		class: className
	}: Props = $props();

	// documentation layout: [0]=description, [1]=docs, [2]=price breakdown, [3]=shipping
	const description = $derived(product.documentation?.at(0));
	const docs = $derived(product.documentation?.at(1));
	const costing = $derived(product.documentation?.at(2));
	const shipping = $derived(product.documentation?.at(3));
	const faq = $derived((product.faq ?? []).filter((item) => item.question?.trim()));

	const hasDocs = $derived(Boolean(docs?.data?.trim() || costing?.data?.trim() || faq.length > 0));

	let activeTab = $state<TabId>('description');

	const tabs = $derived(
		[
			{ id: 'description' as const, label: 'Description', show: true },
			{ id: 'shipping' as const, label: 'Shipping', show: true },
			{ id: 'docs' as const, label: 'Docs', show: hasDocs },
			{
				id: 'reviews' as const,
				label: reviewsError ? 'Reviews' : `Reviews (${reviews.length})`,
				show: true
			}
		].filter((tab) => tab.show)
	);

	// A product without docs must not keep a hidden tab selected (e.g. after a variant switch).
	$effect(() => {
		if (!tabs.some((tab) => tab.id === activeTab)) activeTab = 'description';
	});

	const triggerClass =
		'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground shadow-none transition-all duration-200 hover:bg-muted hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none';
</script>

{#snippet makerContent(
	entry: { data: string; isMDUrl: boolean } | undefined,
	emptyText: string,
	errorText: string
)}
	{#if entry?.isMDUrl && entry.data}
		{@const remote = loadRemoteHtml(entry.data)}
		{#if remote}
			{#await remote}
				<ProseSkeleton class="py-4" lines={4} />
			{:then text}
				<HTMLWrapper html={renderUserContent(text)} />
			{:catch}
				<p class="text-sm text-muted-foreground">{errorText}</p>
			{/await}
		{:else}
			<ProseSkeleton class="py-4" lines={4} />
		{/if}
	{:else if entry?.data?.trim()}
		<HTMLWrapper html={renderUserContent(entry.data)} />
	{:else if emptyText}
		<p class="text-sm text-muted-foreground">{emptyText}</p>
	{/if}
{/snippet}

<section class={cn('space-y-4', className)}>
	<Tabs.Root bind:value={activeTab}>
		<Tabs.List
			class="flex h-auto w-full flex-wrap justify-start gap-2 rounded-none border-b border-border bg-transparent p-0 pb-3"
			aria-label="Product details">
			{#each tabs as tab (tab.id)}
				<Tabs.Trigger value={tab.id} class={triggerClass}>{tab.label}</Tabs.Trigger>
			{/each}
		</Tabs.List>

		<TabPanelTransition tabKey={activeTab} class="mt-4">
			<Tabs.Content value={activeTab} class="mt-0">
				{#if activeTab === 'reviews'}
					<ProductReviews
						productId={product.id}
						bind:reviews
						{initialReviews}
						loadError={reviewsError}
						{supabase} />
				{:else}
					<div class="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
						<div
							class="min-w-0 rounded-lg border border-border bg-card p-5 md:p-6 [&_.html-table-scroll]:-mx-5 [&_.html-table-scroll]:w-[calc(100%+2.5rem)] md:[&_.html-table-scroll]:mx-0 md:[&_.html-table-scroll]:w-full">
							<MobileExpandable resetKey={activeTab}>
								<div
									class="prose prose-sm max-w-none break-words text-foreground prose-a:break-all">
									{#if activeTab === 'description'}
										{@render makerContent(
											description,
											"The maker hasn't added a description yet.",
											"Couldn't load the description. Refresh to try again."
										)}
									{:else if activeTab === 'shipping'}
										<ul class="not-prose mb-4 space-y-1 text-sm text-foreground">
											<li>Flat ₹99 delivery anywhere in India</li>
											<li>Ships in 3 to 14 days</li>
										</ul>
										{@render makerContent(
											shipping,
											'',
											"Couldn't load the shipping notes. Refresh to try again."
										)}
										<p class="not-prose mt-4 text-sm text-muted-foreground">
											Read the
											<!-- eslint-disable svelte/no-navigation-without-resolve -- static policy anchor -->
											<a
												href="/policy#shipping"
												class="text-foreground underline underline-offset-2">
												shipping policy
											</a>
											<!-- eslint-enable svelte/no-navigation-without-resolve -->
											and
											<!-- eslint-disable svelte/no-navigation-without-resolve -- static policy anchor -->
											<a
												href="/policy#cancellation"
												class="text-foreground underline underline-offset-2">
												cancellation and refunds
											</a>.
											<!-- eslint-enable svelte/no-navigation-without-resolve -->
										</p>
									{:else if activeTab === 'docs'}
										<div class="space-y-6">
											{#if docs?.data?.trim()}
												<section>
													<h3>Documentation</h3>
													{@render makerContent(
														docs,
														'',
														"Couldn't load the documentation. Refresh to try again."
													)}
												</section>
											{/if}

											{#if faq.length > 0}
												<section>
													<h3>FAQ</h3>
													<Accordion.Root class="not-prose w-full" type="multiple">
														{#each faq as item, index (item.question + index)}
															<Accordion.Item
																value="faq-{index}"
																class="border-b border-border last:border-0">
																<Accordion.Trigger
																	class="items-start gap-3 py-4 text-left text-sm font-medium hover:no-underline">
																	<span class="min-w-0 flex-1 text-left">{item.question}</span>
																</Accordion.Trigger>
																<Accordion.Content class="text-sm text-muted-foreground">
																	<HTMLWrapper html={renderUserContent(item.answer ?? '')} />
																</Accordion.Content>
															</Accordion.Item>
														{/each}
													</Accordion.Root>
												</section>
											{/if}

											{#if costing?.data?.trim()}
												<section>
													<h3>Price breakdown</h3>
													{#if costing.isMDUrl}
														{@render makerContent(
															costing,
															'',
															"Couldn't load the price breakdown. Refresh to try again."
														)}
													{:else}
														<HTMLWrapper html={renderCostingMarkdown(costing.data)} />
													{/if}
												</section>
											{/if}
										</div>
									{/if}
								</div>
							</MobileExpandable>
						</div>

						<div class="min-w-0 rounded-lg border border-border bg-card p-5 md:p-6">
							<ProductReviews
								productId={product.id}
								bind:reviews
								{initialReviews}
								loadError={reviewsError}
								{supabase}
								compact
								onShowAll={() => (activeTab = 'reviews')} />
						</div>
					</div>
				{/if}
			</Tabs.Content>
		</TabPanelTransition>
	</Tabs.Root>
</section>
