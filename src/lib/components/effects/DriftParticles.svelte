<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/client/theme';
	import {
		drawGlowCircle,
		parseRgbString,
		particleBlendMode,
		particleDrawRgb,
		readCssRgb,
		rollAccentParticle
	} from '$lib/utils/particleTheme';
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		particleCount?: number;
		accentChance?: number;
	}

	let { class: className, particleCount = 24, accentChance = 0.12 }: Props = $props();

	let canvas = $state<HTMLCanvasElement>();
	let accentCanvas = $state<HTMLCanvasElement>();
	const blendMode = $derived(particleBlendMode($theme));

	onMount(() => {
		if (!canvas || !accentCanvas) return;

		const canvasEl: HTMLCanvasElement = canvas;
		const accentCanvasEl: HTMLCanvasElement = accentCanvas;
		const rawContext = canvasEl.getContext('2d');
		const rawAccentContext = accentCanvasEl.getContext('2d');
		if (!rawContext || !rawAccentContext) return;
		const context: CanvasRenderingContext2D = rawContext;
		const accentContext: CanvasRenderingContext2D = rawAccentContext;

		let particleRgb = parseRgbString(readCssRgb('--muted-foreground'));

		function syncParticleColor() {
			particleRgb = parseRgbString(readCssRgb('--muted-foreground'));
		}

		let animationId = 0;
		let canvasWidth = 0;
		let canvasHeight = 0;

		const particles: Array<{
			x: number;
			y: number;
			radius: number;
			speedX: number;
			speedY: number;
			opacity: number;
			isAccent: boolean;
			accentRgb: { r: number; g: number; b: number } | null;
		}> = [];

		function setupCanvas() {
			const pixelRatio = window.devicePixelRatio || 1;
			canvasWidth = canvasEl.offsetWidth;
			canvasHeight = canvasEl.offsetHeight;

			for (const el of [canvasEl, accentCanvasEl]) {
				el.width = canvasWidth * pixelRatio;
				el.height = canvasHeight * pixelRatio;
				el.style.width = `${canvasWidth}px`;
				el.style.height = `${canvasHeight}px`;
			}

			context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
			accentContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		}

		function initParticles() {
			particles.length = 0;
			for (let i = 0; i < particleCount; i++) {
				const accent = rollAccentParticle(accentChance);
				particles.push({
					x: Math.random() * canvasWidth,
					y: Math.random() * canvasHeight,
					radius: Math.random() * 1.5 + 1.5,
					speedX: (Math.random() - 0.5) * 0.25,
					speedY: (Math.random() - 0.5) * 0.25,
					opacity: Math.random() * 0.35 + 0.45,
					isAccent: accent.isAccent,
					accentRgb: accent.accentRgb
				});
			}
		}

		let lastTime = 0;

		function animate(timestamp: number) {
			const deltaTime = timestamp - lastTime || 16.67;
			lastTime = timestamp;
			const timeMultiplier = deltaTime / 16.67;

			context.clearRect(0, 0, canvasWidth, canvasHeight);
			accentContext.clearRect(0, 0, canvasWidth, canvasHeight);

			for (const particle of particles) {
				particle.x += particle.speedX * timeMultiplier;
				particle.y += particle.speedY * timeMultiplier;

				if (particle.x < -4) particle.x = canvasWidth + 4;
				if (particle.x > canvasWidth + 4) particle.x = -4;
				if (particle.y < -4) particle.y = canvasHeight + 4;
				if (particle.y > canvasHeight + 4) particle.y = -4;

				const rgb = particleDrawRgb(particleRgb, particle.accentRgb, particle.isAccent);

				if (particle.isAccent) {
					context.beginPath();
					context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
					context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${particle.opacity})`;
					context.fill();
					drawGlowCircle(
						accentContext,
						particle.x,
						particle.y,
						particle.radius,
						rgb,
						particle.opacity
					);
				} else {
					context.beginPath();
					context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
					context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${particle.opacity})`;
					context.fill();
				}
			}

			animationId = requestAnimationFrame(animate);
		}

		setupCanvas();
		initParticles();
		animationId = requestAnimationFrame(animate);

		const resizeObserver = new ResizeObserver(() => {
			syncParticleColor();
			const prevWidth = canvasWidth;
			const prevHeight = canvasHeight;
			setupCanvas();

			if (prevWidth > 0 && prevHeight > 0) {
				const widthRatio = canvasWidth / prevWidth;
				const heightRatio = canvasHeight / prevHeight;
				for (const particle of particles) {
					particle.x *= widthRatio;
					particle.y *= heightRatio;
				}
			} else {
				initParticles();
			}
		});

		resizeObserver.observe(canvasEl);

		const unsubscribeTheme = theme.subscribe(() => {
			syncParticleColor();
		});

		return () => {
			cancelAnimationFrame(animationId);
			resizeObserver.disconnect();
			unsubscribeTheme();
		};
	});
</script>

<div
	class={cn('pointer-events-none absolute inset-0 z-0 h-full w-full', className)}
	aria-hidden="true">
	<canvas bind:this={canvas} class="h-full w-full" style:mix-blend-mode={blendMode}></canvas>
	<canvas bind:this={accentCanvas} class="accent-glow-canvas h-full w-full"></canvas>
</div>

<style>
	.accent-glow-canvas {
		position: absolute;
		inset: 0;
		pointer-events: none;
		mix-blend-mode: screen;
		opacity: 0.55;
	}
</style>
