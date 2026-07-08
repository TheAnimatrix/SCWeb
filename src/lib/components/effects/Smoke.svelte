<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/client/theme';
	import {
		drawGlowRadialBlob,
		drawGlowRect,
		parseRgbString,
		particleBlendMode,
		particleColorCss,
		particleDrawRgb,
		readCssRgb,
		rollAccentParticle,
		type Rgb
	} from '$lib/utils/particleTheme';

	interface Props {
		opacity?: number;
		particleCount?: number;
		color?: string;
		blendMode?: string;
		variant?: 'soft' | 'brutalist' | 'fabric';
		gridSize?: number;
	}

	let {
		opacity = 0.4,
		particleCount = 40,
		color,
		blendMode,
		variant = 'soft',
		gridSize = 12
	}: Props = $props();

	const resolvedBlendMode = $derived(blendMode ?? particleBlendMode($theme));
	const resolvedColor = $derived(color ?? particleColorCss());

	interface SoftParticle {
		x: number;
		y: number;
		radius: number;
		velocity: { x: number; y: number };
		alpha: number;
		decreasing: boolean;
		isAccent: boolean;
		accentRgb: Rgb | null;
	}

	interface BrutalistCell {
		ox: number;
		oy: number;
		edge: number;
		alpha: number;
		isAccent: boolean;
		accentRgb: Rgb | null;
	}

	interface BrutalistWisp {
		x: number;
		y: number;
		vx: number;
		age: number;
		spread: number;
		cells: BrutalistCell[];
	}

	interface FabricDot {
		x: number;
		y: number;
		alpha: number;
		phase: number;
		drift: number;
		seed: number;
		isAccent: boolean;
		accentRgb: Rgb | null;
	}

	let smokeCanvas: HTMLCanvasElement = $state();
	let accentCanvas: HTMLCanvasElement = $state();
	let colorHelper: HTMLDivElement = $state();

	function snap(value: number) {
		return Math.round(value / gridSize) * gridSize;
	}

	function cellAlpha(): number {
		const roll = Math.random();
		if (roll > 0.94) return 1;
		if (roll > 0.72) return 0.28 + Math.random() * 0.22;
		return 0.05 + Math.random() * 0.18;
	}

	function createSoftParticle(): SoftParticle {
		const radius = Math.random() * 180 + 120;
		const accent = rollAccentParticle(0.06);
		return {
			x: Math.random() * (smokeCanvas?.width || 0),
			y: (smokeCanvas?.height || 0) + radius,
			radius,
			velocity: {
				x: (Math.random() - 0.5) * 0.4,
				y: -Math.random() * 0.7 - 0.4
			},
			alpha: 0.07 + Math.random() * 0.08,
			decreasing: Math.random() > 0.5,
			isAccent: accent.isAccent,
			accentRgb: accent.accentRgb
		};
	}

	function createBrutalistWisp(startY?: number): BrutalistWisp {
		const canvasWidth = smokeCanvas?.width || 0;
		const canvasHeight = smokeCanvas?.height || 0;
		const radius = 5 + Math.floor(Math.random() * 2);
		const cells: BrutalistCell[] = [];

		for (let ox = -radius; ox <= radius; ox++) {
			for (let oy = -radius; oy <= radius; oy++) {
				const dist = Math.hypot(ox, oy / 0.82);
				if (dist > radius) continue;

				const edge = dist / radius;
				const spawnChance = 0.34 * (1 - edge * 0.7);
				if (Math.random() > spawnChance) continue;

				const alpha = cellAlpha();
				const accent = rollAccentParticle(alpha >= 1 ? 0.85 : 0.06);

				cells.push({
					ox,
					oy,
					edge,
					alpha,
					isAccent: accent.isAccent,
					accentRgb: accent.accentRgb
				});
			}
		}

		return {
			x: snap(gridSize * 3 + Math.random() * Math.max(gridSize, canvasWidth - gridSize * 6)),
			y: startY ?? canvasHeight + gridSize * 2,
			vx: (Math.random() - 0.5) * 0.04,
			age: 0,
			spread: 1,
			cells
		};
	}

	onMount(() => {
		if (!smokeCanvas || !accentCanvas || !colorHelper) return;

		const ctx = smokeCanvas.getContext('2d');
		const accentCtx = accentCanvas.getContext('2d');
		if (!ctx || !accentCtx) return;

		let frameId = 0;
		let frame = 0;
		let time = 0;

		const resizeCanvas = () => {
			smokeCanvas.width = smokeCanvas.offsetWidth;
			smokeCanvas.height = smokeCanvas.offsetHeight;
			accentCanvas.width = accentCanvas.offsetWidth;
			accentCanvas.height = accentCanvas.offsetHeight;
		};

		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);

		let particleRgb = parseRgbString(readCssRgb('--foreground'));

		function syncParticleRgb() {
			particleRgb = parseRgbString(readCssRgb('--foreground'));
		}

		syncParticleRgb();
		const unsubscribeTheme = theme.subscribe(() => {
			syncParticleRgb();
		});

		if (variant === 'brutalist' || variant === 'fabric') {
			ctx.imageSmoothingEnabled = false;
			accentCtx.imageSmoothingEnabled = false;
		}

		const softParticles: SoftParticle[] = [];
		const brutalistWisps: BrutalistWisp[] = [];
		const fabricDots: FabricDot[] = [];
		const wispCount = Math.max(14, Math.floor(particleCount / 6));

		function initFabricDots() {
			fabricDots.length = 0;
			const spacing = gridSize;
			const cols = Math.max(1, Math.ceil(smokeCanvas.width / spacing));
			const rows = Math.max(1, Math.ceil(smokeCanvas.height / spacing) + 10);
			const target = Math.max(1, particleCount);
			const seen = new Set<string>();
			let guard = 0;

			while (fabricDots.length < target && guard++ < target * 40) {
				const col = Math.floor(Math.random() * cols);
				const row = Math.floor(Math.random() * rows);
				const key = `${col},${row}`;
				if (seen.has(key)) continue;
				seen.add(key);

				const alpha = cellAlpha();
				const accent = rollAccentParticle(alpha >= 1 ? 0.85 : 0.07);

				fabricDots.push({
					x: col * spacing,
					y: row * spacing,
					alpha,
					phase: Math.random() * Math.PI * 2,
					drift: (Math.random() - 0.5) * 0.015,
					seed: Math.random(),
					isAccent: accent.isAccent,
					accentRgb: accent.accentRgb
				});
			}
		}

		for (let i = 0; i < particleCount; i++) {
			if (variant === 'soft') {
				softParticles.push(createSoftParticle());
			}
		}

		if (variant === 'brutalist') {
			for (let i = 0; i < wispCount; i++) {
				const wisp = createBrutalistWisp();
				wisp.y = smokeCanvas.height * (0.35 + Math.random() * 0.75);
				wisp.age = Math.floor(Math.random() * 180);
				wisp.spread = 1 + wisp.age * 0.006;
				brutalistWisps.push(wisp);
			}
		}

		if (variant === 'fabric') {
			initFabricDots();
		}

		function respawnFabricDot(dot: FabricDot) {
			const spacing = gridSize;
			const cols = Math.max(1, Math.ceil(smokeCanvas.width / spacing));
			const alpha = cellAlpha();
			const accent = rollAccentParticle(alpha >= 1 ? 0.85 : 0.07);

			dot.x = Math.floor(Math.random() * cols) * spacing;
			dot.y = smokeCanvas.height + Math.random() * spacing * 6;
			dot.alpha = alpha;
			dot.phase = Math.random() * Math.PI * 2;
			dot.drift = (Math.random() - 0.5) * 0.015;
			dot.seed = Math.random();
			dot.isAccent = accent.isAccent;
			dot.accentRgb = accent.accentRgb;
		}

		function updateSoft() {
			for (let i = 0; i < softParticles.length; i++) {
				const particle = softParticles[i];

				particle.x += particle.velocity.x;
				particle.y += particle.velocity.y;

				if (particle.decreasing) {
					particle.alpha -= 0.0005;
					if (particle.alpha <= 0.06) particle.decreasing = false;
				} else {
					particle.alpha += 0.0005;
					if (particle.alpha >= 0.15) particle.decreasing = true;
				}

				const rgb = particleDrawRgb(particleRgb, particle.accentRgb, particle.isAccent);

				if (particle.isAccent) {
					drawGlowRadialBlob(
						accentCtx,
						particle.x,
						particle.y,
						particle.radius,
						rgb,
						particle.alpha
					);
				} else {
					ctx.beginPath();
					const gradient = ctx.createRadialGradient(
						particle.x,
						particle.y,
						0,
						particle.x,
						particle.y,
						particle.radius
					);

					gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${particle.alpha})`);
					gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

					ctx.fillStyle = gradient;
					ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
					ctx.fill();
				}

				if (
					particle.y < -particle.radius ||
					particle.x < -particle.radius ||
					particle.x > smokeCanvas.width + particle.radius
				) {
					softParticles[i] = createSoftParticle();
				}
			}
		}

		function updateBrutalist() {
			frame += 1;
			const step = frame % 5 === 0;

			for (let i = 0; i < brutalistWisps.length; i++) {
				const wisp = brutalistWisps[i];

				if (step) {
					wisp.age += 1;
					wisp.y -= 0.22;
					wisp.x += wisp.vx + Math.sin(wisp.age * 0.018) * 0.1;
					wisp.spread = 1 + wisp.age * 0.0048;
				}

				const dissipation = Math.min(0.8, wisp.age * 0.0016);
				const visibleEdge = 1 - dissipation;

				for (const cell of wisp.cells) {
					if (cell.edge > visibleEdge) continue;

					const px = snap(wisp.x + cell.ox * gridSize * wisp.spread);
					const py = snap(wisp.y + cell.oy * gridSize * wisp.spread);

					const rgb = particleDrawRgb(particleRgb, cell.accentRgb, cell.isAccent);

					if (cell.isAccent) {
						ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${cell.alpha})`;
						ctx.fillRect(px, py, gridSize, gridSize);
						drawGlowRect(accentCtx, px, py, gridSize, gridSize, rgb, cell.alpha);
					} else {
						ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${cell.alpha})`;
						ctx.fillRect(px, py, gridSize, gridSize);
					}
				}

				if (wisp.y < -gridSize * 16) {
					brutalistWisps[i] = createBrutalistWisp();
				}
			}
		}

		function updateFabric() {
			time += 0.005;
			const spacing = gridSize;
			const height = smokeCanvas.height;

			for (const dot of fabricDots) {
				dot.y -= 0.07 + dot.drift;

				const fall = Math.max(0, Math.min(1, dot.y / height));
				const waveX =
					Math.sin(dot.y * 0.012 + time + dot.phase) * (2 + fall * 5) +
					Math.sin(dot.x * 0.008 + time * 0.55) * (1 + fall * 2);
				const x = dot.x + waveX;
				const y = dot.y;

				const densityThreshold = 0.05 + fall * 0.48;
				if (!dot.isAccent && dot.seed > densityThreshold) {
					if (y < -spacing) respawnFabricDot(dot);
					continue;
				}

				const topFade =
					y < height * 0.15 ? Math.max(dot.isAccent ? 0.45 : 0, y / (height * 0.15)) : 1;
				const baseAlpha = dot.alpha * (0.2 + fall * 0.55) * topFade;
				const alpha = dot.isAccent ? Math.min(1, baseAlpha * 1.35) : baseAlpha;

				if (alpha < 0.02 || y < -spacing) {
					respawnFabricDot(dot);
					continue;
				}

				const rgb = particleDrawRgb(particleRgb, dot.accentRgb, dot.isAccent);
				const px = snap(x);
				const py = snap(y);

				if (dot.isAccent) {
					ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
					ctx.fillRect(px, py, gridSize, gridSize);
					drawGlowRect(accentCtx, px, py, gridSize, gridSize, rgb, alpha);
				} else {
					ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
					ctx.fillRect(px, py, gridSize, gridSize);
				}
			}
		}

		function updateSmoke() {
			if (!colorHelper) return;

			ctx.clearRect(0, 0, smokeCanvas.width, smokeCanvas.height);
			accentCtx.clearRect(0, 0, accentCanvas.width, accentCanvas.height);

			if (variant === 'brutalist') {
				updateBrutalist();
			} else if (variant === 'fabric') {
				updateFabric();
			} else {
				updateSoft();
			}

			frameId = requestAnimationFrame(updateSmoke);
		}

		const onResize = () => {
			resizeCanvas();
			if (variant === 'fabric') initFabricDots();
		};

		window.removeEventListener('resize', resizeCanvas);
		window.addEventListener('resize', onResize);

		updateSmoke();

		return () => {
			cancelAnimationFrame(frameId);
			window.removeEventListener('resize', onResize);
			unsubscribeTheme();
		};
	});
</script>

<div
	class="smoke-container pointer-events-none absolute inset-0 z-0 overflow-hidden"
	class:brutalist={variant === 'brutalist'}
	style="opacity: {opacity}">
	<div bind:this={colorHelper} class="hidden" style="background-color: {resolvedColor}"></div>
	<canvas bind:this={smokeCanvas} class="h-full w-full" style="mix-blend-mode: {resolvedBlendMode}"
	></canvas>
	<canvas bind:this={accentCanvas} class="accent-glow-canvas" aria-hidden="true"></canvas>
	{#if variant === 'brutalist'}
		<div class="brutalist-scanlines pointer-events-none absolute inset-0" aria-hidden="true"></div>
		<div
			class="brutalist-grid pointer-events-none absolute inset-0"
			style="background-size: {gridSize}px {gridSize}px"
			aria-hidden="true">
		</div>
	{/if}
</div>

<style>
	.accent-glow-canvas {
		position: absolute;
		inset: 0;
		height: 100%;
		width: 100%;
		pointer-events: none;
		mix-blend-mode: screen;
		opacity: 0.7;
	}

	.brutalist-scanlines {
		background-image: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 2px,
			rgba(0, 0, 0, 0.02) 2px,
			rgba(0, 0, 0, 0.02) 3px
		);
		mix-blend-mode: multiply;
	}

	.brutalist-grid {
		background-image:
			linear-gradient(to right, rgba(0, 0, 0, 0.025) 1px, transparent 1px),
			linear-gradient(to bottom, rgba(0, 0, 0, 0.025) 1px, transparent 1px);
		mix-blend-mode: multiply;
	}
</style>
