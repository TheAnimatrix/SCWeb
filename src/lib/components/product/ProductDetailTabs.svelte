<script lang="ts">
	import HTMLWrapper from '$lib/components/fundamental/HTMLWrapper.svelte';
	import Loader from '$lib/components/fundamental/Loader.svelte';
	import * as Accordion from '$lib/components/ui/accordion';
	import { cn } from '$lib/utils';
	import ProductReviews from './ProductReviews.svelte';
	import type { Product } from '$lib/types/product';
	import type { SupabaseClient } from '@supabase/supabase-js';

	type TabId = 'description' | 'docs' | 'reviews';

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

	const tabs = $derived([
		{ id: 'description' as const, label: 'description' },
		{ id: 'docs' as const, label: 'docs & firmware' },
		{ id: 'reviews' as const, label: `reviews (${reviews.length})` }
	]);
</script>

<section class={cn('space-y-4', className)}>
	<div class="flex flex-wrap gap-2 border-b border-border pb-3" role="tablist" aria-label="Product details">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === tab.id}
				class={cn(
					'rounded-md px-3 py-1.5 font-mono text-xs transition-colors',
					activeTab === tab.id
						? 'bg-foreground text-background'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'
				)}
				onclick={() => (activeTab = tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	{#if activeTab === 'reviews'}
		<ProductReviews
			productId={product.id}
			bind:reviews
			{initialReviews}
			{supabase}
		/>
	{:else}
		<div class="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
			<div class="min-w-0 rounded-lg border border-border bg-card p-5 md:p-6">
				{#if activeTab === 'description'}
					<div class="prose prose-sm max-w-none text-foreground">
						{#if product.documentation?.at(0)?.isMDUrl && product.documentation?.at(0)?.data}
							{#await fetch(product.documentation.at(0)?.data ?? '')}
								<div class="flex w-full justify-center py-8"><Loader /></div>
							{:then response}
								{#if response.ok}
									{#await response.text()}
										<Loader />
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
					<div class="space-y-6 text-sm text-foreground">
						<div>
							<h3 class="mb-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
								documentation
							</h3>
							{#if product.documentation?.at(1)?.data}
								<div class="whitespace-pre-wrap">{product.documentation.at(1)?.data}</div>
							{:else}
								<p class="text-muted-foreground">No documentation available.</p>
							{/if}
						</div>

						{#if product.faq && product.faq.length > 0}
							<div>
								<h3 class="mb-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">faq</h3>
								<Accordion.Root class="w-full" type="multiple">
									{#each product.faq as faq, index (faq.question + index)}
										<Accordion.Item value="faq-{index}" class="border-b border-border last:border-0">
											<Accordion.Trigger class="text-sm font-medium hover:no-underline">
												{faq.question}
											</Accordion.Trigger>
											<Accordion.Content class="text-sm text-muted-foreground">
												{faq.answer}
											</Accordion.Content>
										</Accordion.Item>
									{/each}
								</Accordion.Root>
							</div>
						{/if}

						<div>
							<h3 class="mb-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
								costing
							</h3>
							{#if product.documentation?.at(2)?.data && product.documentation?.at(2)?.isMDUrl}
								{#await fetch(product.documentation.at(2)?.data ?? '')}
									<div class="flex w-full justify-center py-4"><Loader /></div>
								{:then response}
									{#if response.ok}
										{#await response.text()}
											<Loader />
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
						</div>

						<div>
							<h3 class="mb-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
								shipping
							</h3>
							{#if product.documentation?.at(3)?.data && product.documentation?.at(3)?.isMDUrl}
								{#await fetch(product.documentation.at(3)?.data ?? '')}
									<div class="flex w-full justify-center py-4"><Loader /></div>
								{:then response}
									{#if response.ok}
										{#await response.text()}
											<Loader />
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
						</div>
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
</section>
