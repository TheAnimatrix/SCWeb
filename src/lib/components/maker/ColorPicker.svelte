<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	const dispatch = createEventDispatcher();
	import * as Dialog from '$lib/components/ui/dialog';

	// Color categories and swatches (expand as needed)
	const colorCategories = [
		{
			name: 'Reds',
			colors: [
				{ name: 'Red', hex: '#e53935' },
				{ name: 'Maroon', hex: '#b71c1c' },
				{ name: 'Coral', hex: '#ff6f61' },
				{ name: 'Pink', hex: '#ec407a' },
			]
		},
		{
			name: 'Oranges & Yellows',
			colors: [
				{ name: 'Orange', hex: '#fb8c00' },
				{ name: 'Amber', hex: '#ffb300' },
				{ name: 'Yellow', hex: '#fdd835' },
				{ name: 'Gold', hex: '#ffd700' },
			]
		},
		{
			name: 'Greens',
			colors: [
				{ name: 'Green', hex: '#43a047' },
				{ name: 'Lime', hex: '#cddc39' },
				{ name: 'Teal', hex: '#00897b' },
				{ name: 'Mint', hex: '#98ff98' },
			]
		},
		{
			name: 'Blues',
			colors: [
				{ name: 'Blue', hex: '#1e88e5' },
				{ name: 'Navy', hex: '#283593' },
				{ name: 'Cyan', hex: '#00bcd4' },
				{ name: 'Sky Blue', hex: '#81d4fa' },
			]
		},
		{
			name: 'Purples',
			colors: [
				{ name: 'Purple', hex: '#8e24aa' },
				{ name: 'Violet', hex: '#7c43bd' },
				{ name: 'Lavender', hex: '#b39ddb' },
				{ name: 'Magenta', hex: '#d500f9' },
			]
		},
		{
			name: 'Neutrals',
			colors: [
				{ name: 'White', hex: '#ffffff' },
				{ name: 'Black', hex: '#212121' },
				{ name: 'Gray', hex: '#9e9e9e' },
				{ name: 'Silver', hex: '#c0c0c0' },
				{ name: 'Brown', hex: '#795548' },
			]
		},
		{
			name: 'Specials',
			colors: [
				{ name: 'Transparent', hex: '#e0e0e0' },
				{ name: 'Gold Metallic', hex: '#ffd700' },
				{ name: 'Copper', hex: '#b87333' },
				{ name: 'Glow Green', hex: '#39ff14' },
			]
		}
	];

	// Props
	let { value = '#ffffff', colorName = '', isOpen = $bindable(false) } = $props<{ value?: string, colorName?: string, isOpen?: boolean }>();

	let customHex = $state(value);
	let selectedName = $state(colorName);

	// HSV state (single source of truth)
	let hue = $state(0);
	let sat = $state(0);
	let val = $state(100);
	let customCanvas: HTMLCanvasElement | null = $state(null);
	
	// Responsive canvas size
	let canvasSize = $state(240);
	
	// Update canvas size based on screen width
	function updateCanvasSize() {
		if (typeof window !== 'undefined') {
			canvasSize = window.innerWidth < 640 ? 
				Math.min(240, window.innerWidth - 40) : 240;
		}
	}

	// Convert hex to HSV
	function hexToHsv(hex: string) {
		hex = hex.replace('#', '');
		if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
		const num = parseInt(hex, 16);
		const r = ((num >> 16) & 255) / 255;
		const g = ((num >> 8) & 255) / 255;
		const b = (num & 255) / 255;
		const max = Math.max(r, g, b), min = Math.min(r, g, b);
		let h = 0, s = 0, v = max;
		const d = max - min;
		s = max === 0 ? 0 : d / max;
		if (max === min) h = 0;
		else {
			switch (max) {
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
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
		let c = v * s;
		let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
		let m = v - c;
		let r = 0, g = 0, b = 0;
		if (h < 60) [r, g, b] = [c, x, 0];
		else if (h < 120) [r, g, b] = [x, c, 0];
		else if (h < 180) [r, g, b] = [0, c, x];
		else if (h < 240) [r, g, b] = [0, x, c];
		else if (h < 300) [r, g, b] = [x, 0, c];
		else [r, g, b] = [c, 0, x];
		const toHex = (n: number) => {
			const h = Math.round((n + m) * 255).toString(16).padStart(2, '0');
			return h;
		};
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
		customHex = inputVal; // Keep raw input until valid
	}

	function confirmColor() {
		dispatch('change', { hex: customHex, name: selectedName });
	}
	function cancelColor() {
		dispatch('cancel');
	}

	// Canvas drawing
	let needsRedraw = false;
	function drawCustomCanvas() {
		if (!customCanvas) return;
		const ctx = customCanvas.getContext('2d');
		if (!ctx) return;

		const width = customCanvas.width;
		const height = customCanvas.height;

		// Clear canvas
		ctx.clearRect(0, 0, width, height);

		// Draw hue/saturation gradient
		const hueColor = hsvToHex(hue, 100, 100); // Get the pure color for the current hue
		const satGradient = ctx.createLinearGradient(0, 0, width, 0);
		satGradient.addColorStop(0, '#fff'); // White
		satGradient.addColorStop(1, hueColor); // Pure hue color
		ctx.fillStyle = satGradient;
		ctx.fillRect(0, 0, width, height);

		// Draw value gradient
		const valGradient = ctx.createLinearGradient(0, 0, 0, height);
		valGradient.addColorStop(0, 'rgba(0,0,0,0)'); // Transparent black
		valGradient.addColorStop(1, '#000'); // Opaque black
		ctx.fillStyle = valGradient;
		ctx.fillRect(0, 0, width, height);

		// Draw marker for current (sat, val)
		const markerX = (sat / 100) * width; // Use width/height directly
		const markerY = (1 - val / 100) * height; // Use width/height directly
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
		let clientX, clientY;

		if (e instanceof MouseEvent) {
			clientX = e.clientX;
			clientY = e.clientY;
		} else if (e.touches && e.touches.length > 0) {
			clientX = e.touches[0].clientX;
			clientY = e.touches[0].clientY;
		} else {
			return; // Ignore other event types or empty touch lists
		}

		const x = clientX - rect.left;
		const y = clientY - rect.top;
		
		// Get actual canvas dimensions
		const width = customCanvas!.width;
		const height = customCanvas!.height;
		
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
		e.preventDefault(); // Keep preventDefault for touch move scrolling
		if (e.touches.length > 0) {
			const rect = customCanvas!.getBoundingClientRect();
			const touch = e.touches[0];
			const x = touch.clientX - rect.left;
			const y = touch.clientY - rect.top;
			
			// Get actual canvas dimensions
			const width = customCanvas!.width;
			const height = customCanvas!.height;

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
		
		// Add window resize listener
		if (typeof window !== 'undefined') {
			window.addEventListener('resize', updateCanvasSize);
		}
		
		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('resize', updateCanvasSize);
			}
		};
	});

	$effect(() => {
		if (customCanvas) {
			requestRedraw();
		}
	});
	
	let canvasWidth = $derived(canvasSize);
	let canvasHeight = $derived(canvasSize);
</script>

<Dialog.Root bind:open={isOpen}>
	<Dialog.Content class="xs:max-h-[80vh] overflow-y-auto max-h-[90vh] sm:max-w-[425px] w-[90vw] backdrop-blur-sm bg-[#101010]/80">
		<Dialog.Header>
			<Dialog.Title>Choose a Color</Dialog.Title>
		</Dialog.Header>

		<div class="color-picker-ui px-2 py-1 min-h-[400px] flex flex-col">
			<!-- Swatches Section -->
			<div class="space-y-3 mb-4">
				{#each colorCategories as category}
					<div class="category">
						<div class="font-semibold text-xs text-white/75 mb-1">{category.name}</div>
						<div class="swatch-grid grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1 sm:gap-2">
							{#each category.colors as color}
								<button
									type="button"
									class="swatch w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all {customHex === color.hex ? 'border-accent ring-2 ring-accent' : 'border-gray-600 hover:border-gray-400'}"
									style="background-color: {color.hex}"
									onclick={() => selectColor(color.hex, color.name)}
									title={color.name}
								>
									{#if customHex === color.hex}
										<svg class="w-3 h-3 sm:w-4 sm:h-4 text-black/80" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<!-- Custom Picker Section -->
			<div class="flex flex-col sm:flex-row gap-4 mt-4 items-center flex-grow">
				<canvas
					bind:this={customCanvas}
					width={canvasWidth}
					height={canvasHeight}
					class="rounded border border-gray-700 cursor-crosshair touch-none block"
					onmousedown={handleCanvasInteraction}
					ontouchstart={handleCanvasInteraction}
					ontouchmove={handleTouchMove}
				></canvas>
				
				<div class="flex sm:flex-col items-center w-full sm:w-auto">
					<div class="hue-slider-container w-full sm:w-auto">
						<input 
							type="range" 
							min="0" 
							max="360" 
							step="1" 
							value={hue} 
							oninput={handleHueChange}
							class="hue-slider w-full sm:w-auto" 
						/>
						<span class="block mt-2 text-xs text-accent text-center">Hue</span>
					</div>
				</div>
			</div>
			
			<!-- Custom hex input and preview at the bottom -->
			<div class="mt-4 flex items-center gap-2 justify-center">
				<input
					type="text"
					bind:value={customHex}
					maxlength="7"
					placeholder="#RRGGBB"
					class="w-24 px-2 py-1 rounded bg-[#18181b] border border-gray-700 text-sm text-white focus:ring-accent focus:border-accent"
					oninput={handleCustomInput}
				/>
				<span class="inline-block w-8 h-8 rounded-full border border-accent" style="background-color: {customHex}"></span>
				<span class="text-xs text-accent">{customHex}</span>
			</div>
			
			<Dialog.Footer class="mt-4">
				<div class="flex gap-2 justify-center w-full">
					<button type="button" class="px-5 py-2 rounded bg-accent text-black font-semibold hover:bg-accent/90 text-sm" onclick={confirmColor}>Select</button>
				</div>
			</Dialog.Footer>
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
.color-picker-ui {
	width: 100%;
}
.swatch-grid {
	margin-bottom: 0.25rem;
}
.swatch {
	outline: none;
	cursor: pointer;
}
.swatch:focus {
	box-shadow: 0 0 0 2px var(--accent);
}

/* Horizontal slider for mobile, vertical for desktop */
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
	border: 1px solid #444;
	height: 24px;
	background: transparent;
}

/* Chrome, Safari, Edge */
.hue-slider::-webkit-slider-runnable-track {
	background: linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red);
	border-radius: 8px;
	height: 100%;
}
/* Firefox */
.hue-slider::-moz-range-track {
	background: linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red);
	border-radius: 8px;
	height: 100%;
}
/* IE */
.hue-slider::-ms-fill-lower,
.hue-slider::-ms-fill-upper {
	background: linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red);
	border-radius: 8px;
}
</style> 