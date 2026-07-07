<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Drawer from '$lib/components/ui/drawer';
	import { ScButton, ScInput } from '$lib/components/sc';
	import { cn } from '$lib/utils';

	const dispatch = createEventDispatcher<{
		change: { hex: string; name: string };
		cancel: void;
	}>();

	const colorCategories = [
		{
			name: 'Reds',
			colors: [
				{ name: 'Red', hex: '#e53935' },
				{ name: 'Maroon', hex: '#b71c1c' },
				{ name: 'Coral', hex: '#ff6f61' },
				{ name: 'Pink', hex: '#ec407a' }
			]
		},
		{
			name: 'Oranges & Yellows',
			colors: [
				{ name: 'Orange', hex: '#fb8c00' },
				{ name: 'Amber', hex: '#ffb300' },
				{ name: 'Yellow', hex: '#fdd835' },
				{ name: 'Gold', hex: '#ffd700' }
			]
		},
		{
			name: 'Greens',
			colors: [
				{ name: 'Green', hex: '#43a047' },
				{ name: 'Lime', hex: '#cddc39' },
				{ name: 'Teal', hex: '#00897b' },
				{ name: 'Mint', hex: '#98ff98' }
			]
		},
		{
			name: 'Blues',
			colors: [
				{ name: 'Blue', hex: '#1e88e5' },
				{ name: 'Navy', hex: '#283593' },
				{ name: 'Cyan', hex: '#00bcd4' },
				{ name: 'Sky Blue', hex: '#81d4fa' }
			]
		},
		{
			name: 'Purples',
			colors: [
				{ name: 'Purple', hex: '#8e24aa' },
				{ name: 'Violet', hex: '#7c43bd' },
				{ name: 'Lavender', hex: '#b39ddb' },
				{ name: 'Magenta', hex: '#d500f9' }
			]
		},
		{
			name: 'Neutrals',
			colors: [
				{ name: 'White', hex: '#ffffff' },
				{ name: 'Black', hex: '#212121' },
				{ name: 'Gray', hex: '#9e9e9e' },
				{ name: 'Silver', hex: '#c0c0c0' },
				{ name: 'Brown', hex: '#795548' }
			]
		},
		{
			name: 'Specials',
			colors: [
				{ name: 'Transparent', hex: '#e0e0e0' },
				{ name: 'Gold Metallic', hex: '#ffd700' },
				{ name: 'Copper', hex: '#b87333' },
				{ name: 'Glow Green', hex: '#39ff14' }
			]
		}
	];

	let { value = '#ffffff', colorName = '', isOpen = $bindable(false) } = $props<{
		value?: string;
		colorName?: string;
		isOpen?: boolean;
	}>();

	let customHex = $state(value);
	let selectedName = $state(colorName);
	let hue = $state(0);
	let sat = $state(0);
	let val = $state(100);
	let customCanvas: HTMLCanvasElement | null = $state(null);
	let canvasSize = $state(240);
	let isMobile = $state(false);

	function updateCanvasSize() {
		if (typeof window !== 'undefined') {
			canvasSize = window.innerWidth < 640 ? Math.min(240, window.innerWidth - 40) : 240;
		}
	}

	function hexToHsv(hex: string) {
		hex = hex.replace('#', '');
		if (hex.length === 3) hex = hex.split('').map((x) => x + x).join('');
		const num = parseInt(hex, 16);
		const r = ((num >> 16) & 255) / 255;
		const g = ((num >> 8) & 255) / 255;
		const b = (num & 255) / 255;
		const max = Math.max(r, g, b),
			min = Math.min(r, g, b);
		let h = 0,
			s = 0,
			v = max;
		const d = max - min;
		s = max === 0 ? 0 : d / max;
		if (max === min) h = 0;
		else {
			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
					break;
			}
			h /= 6;
		}
		return {
			h: Math.round(h * 360),
			s: Math.round(s * 100),
			v: Math.round(v * 100)
		};
	}

	function hsvToHex(h: number, s: number, v: number) {
		s /= 100;
		v /= 100;
		const c = v * s;
		const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
		const m = v - c;
		let r = 0,
			g = 0,
			b = 0;
		if (h < 60) [r, g, b] = [c, x, 0];
		else if (h < 120) [r, g, b] = [x, c, 0];
		else if (h < 180) [r, g, b] = [0, c, x];
		else if (h < 240) [r, g, b] = [0, x, c];
		else if (h < 300) [r, g, b] = [x, 0, c];
		else [r, g, b] = [c, 0, x];
		const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
		return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	}

	function setFromHex(hex: string) {
		const hsv = hexToHsv(hex);
		hue = hsv.h;
		sat = hsv.s;
		val = hsv.v;
		customHex = hsvToHex(hue, sat, val);
		requestRedraw();
	}

	function selectColor(hex: string, name: string) {
		setFromHex(hex);
		selectedName = name;
		requestRedraw();
	}

	function handleCustomInput(e: Event) {
		const inputVal = (e.target as HTMLInputElement).value;
		if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(inputVal)) {
			setFromHex(inputVal);
			selectedName = '';
		}
		customHex = inputVal;
	}

	function confirmColor() {
		dispatch('change', { hex: customHex, name: selectedName });
	}

	function cancelColor() {
		dispatch('cancel');
	}

	function handleOpenChange(open: boolean) {
		if (!open) cancelColor();
	}

	let needsRedraw = false;
	function drawCustomCanvas() {
		if (!customCanvas) return;
		const ctx = customCanvas.getContext('2d');
		if (!ctx) return;

		const width = customCanvas.width;
		const height = customCanvas.height;
		ctx.clearRect(0, 0, width, height);

		const hueColor = hsvToHex(hue, 100, 100);
		const satGradient = ctx.createLinearGradient(0, 0, width, 0);
		satGradient.addColorStop(0, '#fff');
		satGradient.addColorStop(1, hueColor);
		ctx.fillStyle = satGradient;
		ctx.fillRect(0, 0, width, height);

		const valGradient = ctx.createLinearGradient(0, 0, 0, height);
		valGradient.addColorStop(0, 'rgba(0,0,0,0)');
		valGradient.addColorStop(1, '#000');
		ctx.fillStyle = valGradient;
		ctx.fillRect(0, 0, width, height);

		const markerX = (sat / 100) * width;
		const markerY = (1 - val / 100) * height;
		ctx.save();
		ctx.beginPath();
		ctx.arc(markerX, markerY, 7, 0, 2 * Math.PI);
		ctx.lineWidth = 2;
		ctx.strokeStyle = '#fff';
		ctx.shadowColor = '#000';
		ctx.shadowBlur = 2;
		ctx.stroke();
		ctx.restore();
	}

	function requestRedraw() {
		if (!needsRedraw) {
			needsRedraw = true;
			requestAnimationFrame(() => {
				needsRedraw = false;
				drawCustomCanvas();
			});
		}
	}

	function handleCanvasInteraction(e: MouseEvent | TouchEvent) {
		const rect = customCanvas!.getBoundingClientRect();
		let clientX: number, clientY: number;

		if (e instanceof MouseEvent) {
			clientX = e.clientX;
			clientY = e.clientY;
		} else if (e.touches && e.touches.length > 0) {
			clientX = e.touches[0].clientX;
			clientY = e.touches[0].clientY;
		} else {
			return;
		}

		const x = clientX - rect.left;
		const y = clientY - rect.top;
		sat = Math.max(0, Math.min(100, (x / rect.width) * 100));
		val = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));
		customHex = hsvToHex(hue, sat, val);
		selectedName = '';
		requestRedraw();
	}

	function handleHueChange(e: Event) {
		hue = +(e.target as HTMLInputElement).value;
		customHex = hsvToHex(hue, sat, val);
		selectedName = '';
		requestRedraw();
	}

	function handleTouchMove(e: TouchEvent) {
		e.preventDefault();
		if (e.touches.length > 0) {
			const rect = customCanvas!.getBoundingClientRect();
			const touch = e.touches[0];
			const x = touch.clientX - rect.left;
			const y = touch.clientY - rect.top;
			sat = Math.max(0, Math.min(100, (x / rect.width) * 100));
			val = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));
			customHex = hsvToHex(hue, sat, val);
			selectedName = '';
			requestRedraw();
		}
	}

	onMount(() => {
		setFromHex(value);
		updateCanvasSize();

		const mq = window.matchMedia('(max-width: 767px)');
		const updateMobile = () => {
			isMobile = mq.matches;
		};
		updateMobile();
		mq.addEventListener('change', updateMobile);

		window.addEventListener('resize', updateCanvasSize);
		return () => {
			window.removeEventListener('resize', updateCanvasSize);
			mq.removeEventListener('change', updateMobile);
		};
	});

	$effect(() => {
		if (customCanvas) {
			requestRedraw();
		}
	});

	const canvasWidth = $derived(canvasSize);
	const canvasHeight = $derived(canvasSize);
</script>

{#snippet pickerBody()}
	<div class="space-y-4">
		{#each colorCategories as category (category.name)}
			<div>
				<p class="mb-2 font-mono text-xs text-muted-foreground">{category.name}</p>
				<div class="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8">
					{#each category.colors as color (color.hex)}
						<button
							type="button"
							class={cn(
								'swatch flex size-8 items-center justify-center rounded-full border-2 transition-all sm:size-9',
								customHex === color.hex
									? 'border-foreground ring-2 ring-foreground/10'
									: 'border-border hover:border-foreground/40'
							)}
							style="background-color: {color.hex}"
							onclick={() => selectColor(color.hex, color.name)}
							title={color.name}
						>
							{#if customHex === color.hex}
								<svg
									class="size-3.5 text-foreground"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
									><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg
								>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/each}

		<div class="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
			<canvas
				bind:this={customCanvas}
				width={canvasWidth}
				height={canvasHeight}
				class="touch-none cursor-crosshair rounded-md border border-border"
				onmousedown={handleCanvasInteraction}
				ontouchstart={handleCanvasInteraction}
				ontouchmove={handleTouchMove}
			></canvas>

			<div class="hue-slider-container w-full sm:w-auto">
				<input
					type="range"
					min="0"
					max="360"
					step="1"
					value={hue}
					oninput={handleHueChange}
					class="hue-slider w-full"
				/>
				<span class="mt-2 block text-center font-mono text-xs text-muted-foreground">hue</span>
			</div>
		</div>

		<div class="flex items-center justify-center gap-2">
			<ScInput
				bind:value={customHex}
				maxlength={7}
				placeholder="#RRGGBB"
				class="w-28 font-mono"
				glow={false}
				oninput={handleCustomInput}
			/>
			<span
				class="inline-block size-8 rounded-full border border-border"
				style="background-color: {customHex}"
			></span>
			<span class="font-mono text-xs text-muted-foreground">{customHex}</span>
		</div>
	</div>
{/snippet}

{#snippet pickerFooter()}
	<div class="flex justify-end gap-2">
		<ScButton variant="secondary" onclick={cancelColor}>Cancel</ScButton>
		<ScButton onclick={confirmColor}>Select color</ScButton>
	</div>
{/snippet}

{#if isMobile}
	<Drawer.Root bind:open={isOpen} onOpenChange={handleOpenChange}>
		<Drawer.Content class="max-h-[92vh] border-border bg-background">
			<Drawer.Header class="border-b border-border pb-4 text-left">
				<Drawer.Title class="font-mono text-sm text-foreground">choose_color</Drawer.Title>
			</Drawer.Header>
			<div class="overflow-y-auto px-4 py-4">
				{@render pickerBody()}
			</div>
			<Drawer.Footer class="border-t border-border">
				{@render pickerFooter()}
			</Drawer.Footer>
		</Drawer.Content>
	</Drawer.Root>
{:else}
	<Dialog.Root bind:open={isOpen} onOpenChange={handleOpenChange}>
		<Dialog.Content class="max-h-[90vh] w-[95vw] overflow-hidden border-border bg-card p-0 sm:max-w-md">
			<Dialog.Header class="border-b border-border px-6 py-4">
				<Dialog.Title class="font-mono text-sm text-foreground">choose_color</Dialog.Title>
			</Dialog.Header>
			<div class="max-h-[calc(90vh-8rem)] overflow-y-auto px-6 py-4">
				{@render pickerBody()}
			</div>
			<Dialog.Footer class="border-t border-border px-6 py-4">
				{@render pickerFooter()}
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<style>
	.hue-slider-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
	}

	@media (min-width: 640px) {
		.hue-slider-container {
			height: 240px;
			width: 24px;
		}
		.hue-slider {
			transform: rotate(-90deg);
			width: 240px !important;
			height: 24px;
		}
	}

	.hue-slider {
		border-radius: 8px;
		border: 1px solid hsl(var(--border));
		height: 24px;
		background: transparent;
	}

	.hue-slider::-webkit-slider-runnable-track {
		background: linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red);
		border-radius: 8px;
		height: 100%;
	}

	.hue-slider::-moz-range-track {
		background: linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red);
		border-radius: 8px;
		height: 100%;
	}
</style>
