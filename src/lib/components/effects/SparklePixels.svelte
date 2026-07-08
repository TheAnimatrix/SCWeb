<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/client/theme';
	import { parseRgbString, particleBlendMode, readCssRgb } from '$lib/utils/particleTheme';
	import { cn } from '$lib/utils';

	type Rgb = readonly [number, number, number];

	interface Props {
		class?: string;
		active?: boolean;
		intensity?: number;
		gridSize?: number;
		palette?: readonly Rgb[];
	}

	let {
		class: className,
		active = true,
		intensity = 0.58,
		gridSize = 2,
		palette = [
			[255, 0, 255],
			[255, 45, 180],
			[200, 60, 255],
			[140, 80, 255],
			[0, 220, 255],
			[255, 255, 255]
		]
	}: Props = $props();

	let canvas = $state<HTMLCanvasElement>();

	const blendMode = $derived(particleBlendMode($theme));

	interface Sparkle {
		gx: number;
		gy: number;
		colorIndex: number;
		baseAlpha: number;
		phase: number;
		twinkle: boolean;
	}

	onMount(() => {
		if (!canvas) return;

		const canvasEl = canvas;
		const context = canvasEl.getContext('2d');
		if (!context) return;

		let animationId = 0;
		let width = 0;
		let height = 0;
		let sparkles: Sparkle[] = [];
		let time = 0;
		let bgRgb = parseRgbString(readCssRgb('--background'));

		function syncBackground() {
			bgRgb = parseRgbString(readCssRgb('--background'));
		}

		function setupCanvas() {
			const pixelRatio = window.devicePixelRatio || 1;
			const resizeTarget = canvasEl.parentElement ?? canvasEl;
			width = resizeTarget.clientWidth;
			height = resizeTarget.clientHeight;

			canvasEl.width = width * pixelRatio;
			canvasEl.height = height * pixelRatio;
			canvasEl.style.width = `${width}px`;
			canvasEl.style.height = `${height}px`;

			context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		}

		function shouldPlaceSparkle() {
			return Math.random() < 0.42;
		}

		function initSparkles() {
			sparkles = [];
			const cols = Math.ceil(width / gridSize);
			const rows = Math.ceil(height / gridSize);

			for (let row = 0; row < rows; row++) {
				for (let col = 0; col < cols; col++) {
					if (!shouldPlaceSparkle()) continue;

					sparkles.push({
						gx: col * gridSize,
						gy: row * gridSize,
						colorIndex: Math.floor(Math.random() * palette.length),
						baseAlpha: 0.12 + Math.random() * 0.4,
						phase: Math.random() * Math.PI * 2,
						twinkle: Math.random() > 0.5
					});
				}
			}
		}

		function drawFrame() {
			context.fillStyle = `rgb(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b})`;
			context.fillRect(0, 0, width, height);

			if (!active) return;

			const strength = Math.max(0, Math.min(1, intensity));

			for (const sparkle of sparkles) {
				const twinkleMod = sparkle.twinkle
					? 0.7 + Math.sin(time * 3 + sparkle.phase) * 0.3
					: 1;
				const alpha = sparkle.baseAlpha * twinkleMod * strength;
				if (alpha < 0.03) continue;

				const [r, g, b] = palette[sparkle.colorIndex];
				context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
				context.fillRect(sparkle.gx, sparkle.gy, gridSize, gridSize);
			}
		}

		function animate() {
			time += 0.016;
			drawFrame();
			animationId = requestAnimationFrame(animate);
		}

		setupCanvas();
		initSparkles();
		animationId = requestAnimationFrame(animate);

		const resizeObserver = new ResizeObserver(() => {
			syncBackground();
			setupCanvas();
			initSparkles();
		});

		const resizeTarget = canvasEl.parentElement ?? canvasEl;
		resizeObserver.observe(resizeTarget);

		const unsubscribeTheme = theme.subscribe(() => {
			syncBackground();
		});

		return () => {
			cancelAnimationFrame(animationId);
			resizeObserver.disconnect();
			unsubscribeTheme();
		};
	});
</script>

<canvas
	bind:this={canvas}
	class={cn('pointer-events-none absolute inset-0 z-0 h-full w-full', className)}
	style:mix-blend-mode={blendMode}
	aria-hidden="true"
></canvas>
