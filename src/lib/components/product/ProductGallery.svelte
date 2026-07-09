<script lang="ts">
	import { fade } from 'svelte/transition';
	import { cn } from '$lib/utils';
	import { PlaceholderImage, TagBadge } from '$lib/components/sc';
	import { getTabFadeIn, getTabFadeOut } from '$lib/utils/tabTransition';
	import ProductImageZoomModal from './ProductImageZoomModal.svelte';
	import { isOpenHardware } from './productSpecs';
	import type { Product } from '$lib/types/product';

	interface Props {
		product: Product;
		indicatorCur?: number;
		onIndicatorChange?: (index: number) => void;
		class?: string;
	}

	let {
		product,
		indicatorCur = $bindable(0),
		onIndicatorChange,
		class: className
	}: Props = $props();

	const images = $derived(product.images ?? []);
	const indicatorMax = $derived(Math.max(images.length, 1));
	const currentImage = $derived(images[indicatorCur]?.url ?? images[0]?.url ?? null);
	const showOpenHardware = $derived(isOpenHardware(product));
	let zoomOpen = $state(false);

	function openZoom() {
		if (currentImage) zoomOpen = true;
	}

	function selectImage(index: number) {
		indicatorCur = index;
		onIndicatorChange?.(index);
	}
</script>

<div class={cn('min-w-0 space-y-3', className)}>
	<div class="overflow-hidden rounded-lg border border-border bg-card">
		<div class="relative aspect-[4/3] overflow-hidden">
			{#key indicatorCur}
				<button
					type="button"
					class={cn(
						'absolute inset-0',
						currentImage ? 'cursor-zoom-in' : 'cursor-default'
					)}
					aria-label={currentImage ? `View larger image of ${product.name}` : undefined}
					disabled={!currentImage}
					onclick={openZoom}
					in:fade={getTabFadeIn()}
					out:fade={getTabFadeOut()}>
					<PlaceholderImage src={currentImage} alt={product.name} loading="eager" />
				</button>
			{/key}

			{#if showOpenHardware}
				<div class="absolute left-3 top-3 z-10">
					<TagBadge label="OPEN HARDWARE" />
				</div>
			{/if}
		</div>
	</div>

	{#if indicatorMax > 1}
		<div class="flex min-w-0 flex-wrap gap-2" role="tablist" aria-label="Product images">
			{#each images as image, index (image.url + index)}
				<button
					type="button"
					role="tab"
					aria-selected={index === indicatorCur}
					aria-label="View image {index + 1} of {indicatorMax}"
					class={cn(
						'h-16 w-16 overflow-hidden rounded-md border bg-card transition-colors',
						index === indicatorCur
							? 'border-foreground'
							: 'border-border hover:border-foreground/30'
					)}
					onclick={() => selectImage(index)}>
					<PlaceholderImage src={image.url} alt="{product.name} thumbnail {index + 1}" />
				</button>
			{/each}
		</div>
	{/if}
</div>

<ProductImageZoomModal bind:open={zoomOpen} src={currentImage} alt={product.name} />
