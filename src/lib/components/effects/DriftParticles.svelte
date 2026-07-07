<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/client/theme';
	import { parseRgbString, particleBlendMode, readCssRgb } from '$lib/utils/particleTheme';
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		particleCount?: number;
	}

	let { class: className, particleCount = 24 }: Props = $props();

	let canvas = $state<HTMLCanvasElement>();
	const blendMode = $derived(particleBlendMode($theme));

	onMount(() => {
		if (!canvas) return;

		const canvasEl: HTMLCanvasElement = canvas;
		const rawContext = canvasEl.getContext('2d');
		if (!rawContext) return;
		const context: CanvasRenderingContext2D = rawContext;

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
		}> = [];

		function setupCanvas() {
			const pixelRatio = window.devicePixelRatio || 1;
			canvasWidth = canvasEl.offsetWidth;
			canvasHeight = canvasEl.offsetHeight;

			canvasEl.width = canvasWidth * pixelRatio;
			canvasEl.height = canvasHeight * pixelRatio;
			canvasEl.style.width = `${canvasWidth}px`;
			canvasEl.style.height = `${canvasHeight}px`;

			context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		}

		function initParticles() {
			particles.length = 0;
			for (let i = 0; i < particleCount; i++) {
				particles.push({
					x: Math.random() * canvasWidth,
					y: Math.random() * canvasHeight,
					radius: Math.random() * 1.5 + 1.5,
					speedX: (Math.random() - 0.5) * 0.25,
					speedY: (Math.random() - 0.5) * 0.25,
					opacity: Math.random() * 0.35 + 0.45
				});
			}
		}

		let lastTime = 0;

		function animate(timestamp: number) {
			const deltaTime = timestamp - lastTime || 16.67;
			lastTime = timestamp;
			const timeMultiplier = deltaTime / 16.67;

			context.clearRect(0, 0, canvasWidth, canvasHeight);

			for (const particle of particles) {
				particle.x += particle.speedX * timeMultiplier;
				particle.y += particle.speedY * timeMultiplier;

				if (particle.x < -4) particle.x = canvasWidth + 4;
				if (particle.x > canvasWidth + 4) particle.x = -4;
				if (particle.y < -4) particle.y = canvasHeight + 4;
				if (particle.y > canvasHeight + 4) particle.y = -4;

				context.beginPath();
				context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
				context.fillStyle = `rgba(${particleRgb.r}, ${particleRgb.g}, ${particleRgb.b}, ${particle.opacity})`;
				context.fill();
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

<canvas
	bind:this={canvas}
	class={cn('pointer-events-none absolute inset-0 z-0 h-full w-full', className)}
	style:mix-blend-mode={blendMode}
	aria-hidden="true"
></canvas>
