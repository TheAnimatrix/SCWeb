<script lang="ts">
	import HTMLWrapper from '$lib/components/fundamental/HTMLWrapper.svelte';
	import { ProseSkeleton } from '$lib/components/sc';
	import * as Accordion from '$lib/components/ui/accordion';
	import TabPanelTransition from '$lib/components/ui/TabPanelTransition.svelte';
	import { cn } from '$lib/utils';
	import ProductReviews from './ProductReviews.svelte';
	import type { Product } from '$lib/types/product';
	import type { SupabaseClient } from '@supabase/supabase-js';

	type TabId = 'description' | 'docs' | 'reviews';
	type DocSectionId = 'documentation' | 'faq' | 'costing' | 'shipping';

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
		supabase: SupabaseClient;
		class?: string;
	}

	let {
		product,
		reviews = $bindable([]),
		initialReviews = [],
		supabase,
		class: className
	}: Props = $props();

	let activeTab = $state<TabId>('description');
	let activeDocSection = $state<DocSectionId>('documentation');

	const tabs = $derived([
		{ id: 'description' as const, label: 'description' },
		{ id: 'docs' as const, label: 'docs & firmware' },
		{ id: 'reviews' as const, label: `reviews (${reviews.length})` }
	]);

	const docSections = $derived([
		{ id: 'documentation' as const, label: 'documentation' },
		{ id: 'faq' as const, label: 'faq' },
		{ id: 'costing' as const, label: 'costing' },
		{ id: 'shipping' as const, label: 'shipping' }
	]);

	const tagButtonClass = (isActive: boolean) =>
		cn(
			'rounded-md px-3 py-1.5 font-mono text-xs transition-all duration-200',
			isActive
				? 'bg-foreground text-background'
				: 'text-muted-foreground hover:bg-muted hover:text-foreground'
		);
</script>

<section class={cn('space-y-4', className)}>
	<div class="flex flex-wrap gap-2 border-b border-border pb-3" role="tablist" aria-label="Product details">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === tab.id}
				class={tagButtonClass(activeTab === tab.id)}
				onclick={() => (activeTab = tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<TabPanelTransition tabKey={activeTab}>
		{#if activeTab === 'reviews'}
			<ProductReviews
				productId={product.id}
				bind:reviews
				{initialReviews}
				{supabase}
			/>
		{:else}
			<div class="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				<div
					class="min-w-0 rounded-lg border border-border bg-card p-5 md:p-6 [&_.html-table-scroll]:-mx-5 [&_.html-table-scroll]:w-[calc(100%+2.5rem)] md:[&_.html-table-scroll]:mx-0 md:[&_.html-table-scroll]:w-full"
				>
					{#if activeTab === 'description'}
						<div class="prose prose-sm max-w-none break-words text-foreground prose-a:break-all">
							{#if product.documentation?.at(0)?.isMDUrl && product.documentation?.at(0)?.data}
								{#await fetch(product.documentation.at(0)?.data ?? '')}
									<ProseSkeleton class="py-4" />
								{:then response}
									{#if response.ok}
										{#await response.text()}
											<ProseSkeleton class="py-4" />
										{:then text}
											<HTMLWrapper html={text} />
										{/await}
									{:else}
										<p class="text-center text-sm text-muted-foreground">
											Oops! There was an error retrieving the description.
										</p>
									{/if}
								{/await}
							{:else if product.documentation?.at(0)?.data}
								<HTMLWrapper html={product.documentation.at(0)?.data ?? ''} />
							{:else}
								<p class="text-center text-sm text-muted-foreground">No description available yet.</p>
							{/if}
						</div>
					{:else}
						<div class="space-y-4 text-sm text-foreground">
							<div
								class="flex flex-wrap gap-2 border-b border-border pb-3"
								role="tablist"
								aria-label="Documentation sections"
							>
								{#each docSections as section (section.id)}
									<button
										type="button"
										role="tab"
										aria-selected={activeDocSection === section.id}
										class={tagButtonClass(activeDocSection === section.id)}
										onclick={() => (activeDocSection = section.id)}
									>
										{section.label}
									</button>
								{/each}
							</div>

							<TabPanelTransition tabKey={activeDocSection}>
								{#if activeDocSection === 'documentation'}
									{#if product.documentation?.at(1)?.data}
										<div class="whitespace-pre-wrap">{product.documentation.at(1)?.data}</div>
									{:else}
										<p class="text-muted-foreground">No documentation available.</p>
									{/if}
								{:else if activeDocSection === 'faq'}
									{#if product.faq && product.faq.length > 0}
										<Accordion.Root class="w-full" type="multiple">
											{#each product.faq as faq, index (faq.question + index)}
												<Accordion.Item value="faq-{index}" class="border-b border-border last:border-0">
													<Accordion.Trigger
														class="items-start gap-3 py-4 text-left text-sm font-medium hover:no-underline"
													>
														<span class="min-w-0 flex-1 text-left">{faq.question}</span>
													</Accordion.Trigger>
													<Accordion.Content class="text-sm text-muted-foreground">
														{faq.answer}
													</Accordion.Content>
												</Accordion.Item>
											{/each}
										</Accordion.Root>
									{:else}
										<p class="text-muted-foreground">No FAQ available.</p>
									{/if}
								{:else if activeDocSection === 'costing'}
									{#if product.documentation?.at(2)?.data && product.documentation?.at(2)?.isMDUrl}
										{#await fetch(product.documentation.at(2)?.data ?? '')}
											<ProseSkeleton lines={4} />
										{:then response}
											{#if response.ok}
												{#await response.text()}
													<ProseSkeleton lines={4} />
												{:then text}
													<HTMLWrapper html={text} />
												{/await}
											{:else}
												<p class="text-muted-foreground">No costing details available.</p>
											{/if}
										{/await}
									{:else if product.documentation?.at(2)?.data}
										<HTMLWrapper html={product.documentation.at(2)?.data ?? ''} />
									{:else}
										<p class="text-muted-foreground">No costing details available.</p>
									{/if}
								{:else}
									{#if product.documentation?.at(3)?.data && product.documentation?.at(3)?.isMDUrl}
										{#await fetch(product.documentation.at(3)?.data ?? '')}
											<ProseSkeleton lines={4} />
										{:then response}
											{#if response.ok}
												{#await response.text()}
													<ProseSkeleton lines={4} />
												{:then text}
													<HTMLWrapper html={text} />
												{/await}
											{:else}
												<p class="text-muted-foreground">No shipping details available.</p>
											{/if}
										{/await}
									{:else if product.documentation?.at(3)?.data}
										<HTMLWrapper html={product.documentation.at(3)?.data ?? ''} />
									{:else}
										<p class="text-muted-foreground">No shipping details available.</p>
									{/if}
								{/if}
							</TabPanelTransition>
						</div>
					{/if}
				</div>

				<div class="min-w-0 rounded-lg border border-border bg-card p-5 md:p-6">
					<ProductReviews
						productId={product.id}
						bind:reviews
						{initialReviews}
						{supabase}
						compact
					/>
				</div>
			</div>
		{/if}
	</TabPanelTransition>
</section>
