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

	function step(delta: number) {
		if (images.length < 2) return;
		selectImage((indicatorCur + delta + images.length) % images.length);
	}

	function photoAlt(index: number): string {
		return images.length > 1
			? `${product.name}, photo ${index + 1} of ${images.length}`
			: product.name;
	}

	// Swipe the main image on touch screens. A swipe must not also open the zoom view.
	const SWIPE_THRESHOLD_PX = 40;
	let swipeStartX: number | null = null;
	let swipeStartY = 0;
	let swiped = false;

	function handlePointerDown(event: PointerEvent) {
		if (event.pointerType === 'mouse' || images.length < 2) return;
		swipeStartX = event.clientX;
		swipeStartY = event.clientY;
		swiped = false;
	}

	function handlePointerUp(event: PointerEvent) {
		if (swipeStartX === null) return;
		const dx = event.clientX - swipeStartX;
		const dy = event.clientY - swipeStartY;
		swipeStartX = null;
		if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
		swiped = true;
		step(dx < 0 ? 1 : -1);
	}

	function handleMainClick() {
		if (swiped) {
			swiped = false;
			return;
		}
		openZoom();
	}
</script>

<div class={cn('min-w-0 space-y-3', className)}>
	<div class="overflow-hidden rounded-lg border border-border bg-card">
		<div
			class="relative aspect-[4/3] overflow-hidden"
			role="group"
			aria-label="Product photos"
			style:touch-action="pan-y"
			onpointerdown={handlePointerDown}
			onpointerup={handlePointerUp}
			onpointercancel={() => (swipeStartX = null)}>
			{#key indicatorCur}
				<button
					type="button"
					class={cn('absolute inset-0', currentImage ? 'cursor-zoom-in' : 'cursor-default')}
					aria-label={currentImage ? `View larger: ${photoAlt(indicatorCur)}` : undefined}
					disabled={!currentImage}
					onclick={handleMainClick}
					in:fade={getTabFadeIn()}
					out:fade={getTabFadeOut()}>
					<PlaceholderImage src={currentImage} alt={photoAlt(indicatorCur)} loading="eager" />
				</button>
			{/key}

			{#if showOpenHardware}
				<div class="absolute left-3 top-3 z-10">
					<TagBadge label="Open hardware" />
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
					aria-label="Show photo {index + 1} of {indicatorMax}"
					class={cn(
						'h-16 w-16 overflow-hidden rounded-md border bg-card transition-colors',
						index === indicatorCur
							? 'border-foreground'
							: 'border-border hover:border-foreground/30'
					)}
					onclick={() => selectImage(index)}>
					<PlaceholderImage src={image.url} alt="" />
				</button>
			{/each}
		</div>
	{/if}
</div>

<ProductImageZoomModal
	bind:open={zoomOpen}
	src={currentImage}
	alt={photoAlt(indicatorCur)}
	positionLabel={images.length > 1 ? `${indicatorCur + 1} of ${images.length}` : undefined}
	onPrev={images.length > 1 ? () => step(-1) : undefined}
	onNext={images.length > 1 ? () => step(1) : undefined} />
