<script lang="ts">
	import Icon from '@iconify/svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { F } from '$lib/icons/fluent';
	import { cn } from '$lib/utils';

	interface Props {
		open?: boolean;
		src: string | null;
		alt: string;
	}

	let { open = $bindable(false), src, alt }: Props = $props();

	const MIN_SCALE = 1;
	const MAX_SCALE = 4;
	const ZOOM_FACTOR = 1.25;

	let scale = $state(1);
	let panX = $state(0);
	let panY = $state(0);

	let viewportEl = $state<HTMLDivElement | null>(null);
	let isPanning = $state(false);
	let lastPanX = 0;
	let lastPanY = 0;
	let pinchStartDistance = 0;
	let pinchStartScale = 1;
	let lastTapTime = 0;

	const imageTransform = $derived(`translate(${panX}px, ${panY}px) scale(${scale})`);

	const controlButtonClass =
		'inline-flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white transition-colors hover:bg-black/70 active:bg-black/80 disabled:pointer-events-none disabled:opacity-40';

	function resetView() {
		scale = 1;
		panX = 0;
		panY = 0;
		isPanning = false;
	}

	function handleOpenChange(next: boolean) {
		open = next;
		if (!next) resetView();
	}

	function clampPan(nextX: number, nextY: number) {
		if (!viewportEl || scale <= 1) return { x: 0, y: 0 };

		const maxX = (viewportEl.clientWidth * (scale - 1)) / 2;
		const maxY = (viewportEl.clientHeight * (scale - 1)) / 2;

		return {
			x: Math.min(maxX, Math.max(-maxX, nextX)),
			y: Math.min(maxY, Math.max(-maxY, nextY))
		};
	}

	function setPan(nextX: number, nextY: number) {
		const clamped = clampPan(nextX, nextY);
		panX = clamped.x;
		panY = clamped.y;
	}

	function zoomIn() {
		const next = Math.min(MAX_SCALE, scale * ZOOM_FACTOR);
		scale = next;
		setPan(panX, panY);
	}

	function zoomOut() {
		const next = Math.max(MIN_SCALE, scale / ZOOM_FACTOR);
		scale = next;
		if (next === MIN_SCALE) {
			panX = 0;
			panY = 0;
		} else {
			setPan(panX, panY);
		}
	}

	function toggleZoom(clientX: number, clientY: number) {
		if (scale > 1) {
			resetView();
			return;
		}

		if (!viewportEl) {
			scale = 2;
			return;
		}

		const rect = viewportEl.getBoundingClientRect();
		const offsetX = clientX - rect.left - rect.width / 2;
		const offsetY = clientY - rect.top - rect.height / 2;

		scale = 2;
		setPan(-offsetX * 0.5, -offsetY * 0.5);
	}

	function getTouchDistance(touches: TouchList) {
		const dx = touches[0].clientX - touches[1].clientX;
		const dy = touches[0].clientY - touches[1].clientY;
		return Math.hypot(dx, dy);
	}

	function handlePointerDown(event: PointerEvent) {
		if (event.pointerType === 'touch') return;
		if (scale <= 1) return;

		isPanning = true;
		lastPanX = event.clientX;
		lastPanY = event.clientY;
		viewportEl?.setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!isPanning || event.pointerType === 'touch') return;

		const deltaX = event.clientX - lastPanX;
		const deltaY = event.clientY - lastPanY;
		lastPanX = event.clientX;
		lastPanY = event.clientY;
		setPan(panX + deltaX, panY + deltaY);
	}

	function handlePointerUp(event: PointerEvent) {
		if (event.pointerType === 'touch') return;
		isPanning = false;
		if (viewportEl?.hasPointerCapture(event.pointerId)) {
			viewportEl.releasePointerCapture(event.pointerId);
		}
	}

	function handleTouchStart(event: TouchEvent) {
		if (event.touches.length === 2) {
			pinchStartDistance = getTouchDistance(event.touches);
			pinchStartScale = scale;
			return;
		}

		if (event.touches.length === 1) {
			const now = Date.now();
			const touch = event.touches[0];
			if (now - lastTapTime < 300) {
				event.preventDefault();
				toggleZoom(touch.clientX, touch.clientY);
				lastTapTime = 0;
				return;
			}
			lastTapTime = now;

			if (scale > 1) {
				isPanning = true;
				lastPanX = touch.clientX;
				lastPanY = touch.clientY;
			}
		}
	}

	function handleTouchMove(event: TouchEvent) {
		if (event.touches.length === 2) {
			event.preventDefault();
			const distance = getTouchDistance(event.touches);
			if (pinchStartDistance <= 0) return;

			const next = Math.min(
				MAX_SCALE,
				Math.max(MIN_SCALE, pinchStartScale * (distance / pinchStartDistance))
			);
			scale = next;
			if (next === MIN_SCALE) {
				panX = 0;
				panY = 0;
			} else {
				setPan(panX, panY);
			}
			return;
		}

		if (event.touches.length === 1 && isPanning && scale > 1) {
			event.preventDefault();
			const touch = event.touches[0];
			const deltaX = touch.clientX - lastPanX;
			const deltaY = touch.clientY - lastPanY;
			lastPanX = touch.clientX;
			lastPanY = touch.clientY;
			setPan(panX + deltaX, panY + deltaY);
		}
	}

	function handleTouchEnd() {
		isPanning = false;
		pinchStartDistance = 0;
	}

	$effect(() => {
		const el = viewportEl;
		if (!el || !open) return;

		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			if (event.deltaY < 0) zoomIn();
			else zoomOut();
		};

		const onTouchMove = (event: TouchEvent) => {
			handleTouchMove(event);
			if (event.touches.length >= 2 || (event.touches.length === 1 && isPanning && scale > 1)) {
				event.preventDefault();
			}
		};

		el.addEventListener('wheel', onWheel, { passive: false });
		el.addEventListener('touchmove', onTouchMove, { passive: false });

		return () => {
			el.removeEventListener('wheel', onWheel);
			el.removeEventListener('touchmove', onTouchMove);
		};
	});
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content
		class="!fixed !inset-0 !left-0 !top-0 !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 gap-0 overflow-hidden border-0 bg-black/95 p-0 shadow-none sm:rounded-none [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100">
		<div class="flex h-full min-h-0 flex-col">
			<div
				bind:this={viewportEl}
				class={cn(
					'relative min-h-0 flex-1 touch-none select-none overflow-hidden',
					scale > 1 ? 'cursor-grab' : 'cursor-default',
					isPanning && 'cursor-grabbing'
				)}
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
				onpointercancel={handlePointerUp}
				ontouchstart={handleTouchStart}
				ontouchend={handleTouchEnd}
				ontouchcancel={handleTouchEnd}
				role="presentation">
				{#if src}
					<div class="absolute inset-0 flex items-center justify-center">
						<img
							{src}
							{alt}
							class="max-h-full max-w-full object-contain transition-transform duration-75 will-change-transform"
							style:transform={imageTransform}
							draggable="false" />
					</div>
				{/if}
			</div>

			<div class="flex shrink-0 items-center justify-center gap-3 border-t border-white/10 px-4 py-4">
				<button
					type="button"
					class={controlButtonClass}
					aria-label="Zoom out"
					disabled={scale <= MIN_SCALE}
					onclick={zoomOut}>
					<Icon icon={F.zoomOut} class="size-5" />
				</button>
				<span class="min-w-14 text-center font-mono text-sm text-white/80">
					{Math.round(scale * 100)}%
				</span>
				<button
					type="button"
					class={controlButtonClass}
					aria-label="Zoom in"
					disabled={scale >= MAX_SCALE}
					onclick={zoomIn}>
					<Icon icon={F.zoomIn} class="size-5" />
				</button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
