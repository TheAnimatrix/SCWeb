<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	interface Props {
		href?: string;
		class?: string;
		children: Snippet;
	}

	let { href, class: className, children }: Props = $props();

	const cardClass = $derived(
		cn(
			'gg-card group relative block min-w-0 w-full rounded-lg p-3 outline-none focus-visible:outline-none',
			className
		)
	);
</script>

{#snippet layers()}
	<span class="gg-ambient gg-layer" aria-hidden="true"></span>
	<span class="gg-halo gg-layer" aria-hidden="true"></span>
	<span class="gg-glow-noise gg-layer" aria-hidden="true"></span>
	<span class="gg-border gg-layer" aria-hidden="true"></span>
	<span class="gg-noise gg-layer" aria-hidden="true"></span>
	<span class="gg-surface gg-layer" aria-hidden="true"></span>
{/snippet}

{#if href}
	<a {href} class={cardClass}>
		{@render layers()}
		<div class="gg-content flex min-w-0 w-full items-center gap-3">
			{@render children()}
		</div>
	</a>
{:else}
	<div class={cardClass}>
		{@render layers()}
		<div class="gg-content flex min-w-0 w-full items-center gap-3">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	@property --gg-halo-inset {
		syntax: '<length>';
		inherits: true;
		initial-value: 8px;
	}

	@property --gg-halo-blur {
		syntax: '<length>';
		inherits: true;
		initial-value: 10px;
	}

	@property --gg-halo-opacity {
		syntax: '<number>';
		inherits: true;
		initial-value: 0.24;
	}

	@property --gg-border-opacity {
		syntax: '<number>';
		inherits: true;
		initial-value: 0.88;
	}

	@property --gg-magenta {
		syntax: '<number>';
		inherits: true;
		initial-value: 0.88;
	}

	@property --gg-indigo {
		syntax: '<number>';
		inherits: true;
		initial-value: 0.72;
	}

	@property --gg-orange {
		syntax: '<number>';
		inherits: true;
		initial-value: 0.8;
	}

	@property --gg-cyan {
		syntax: '<number>';
		inherits: true;
		initial-value: 0.76;
	}

	@property --gg-pink {
		syntax: '<number>';
		inherits: true;
		initial-value: 0.52;
	}

	.gg-card {
		overflow: visible;
		--gg-color-scale: 0.72;
		--gg-noise-opacity: 0.42;
		--gg-glow-noise-opacity: 0.5;
		--gg-noise-fine: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.05' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E");
		--gg-noise-coarse: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='b'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.62' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23b)'/%3E%3C/svg%3E");
		--gg-glow-gradient: radial-gradient(
				ellipse 130% 95% at 50% -18%,
				rgb(232 121 249 / calc(var(--gg-magenta) * var(--gg-color-scale))),
				transparent 78%
			),
			radial-gradient(
				ellipse 95% 120% at 112% 38%,
				rgb(129 140 248 / calc(var(--gg-indigo) * var(--gg-color-scale))),
				transparent 78%
			),
			radial-gradient(
				ellipse 120% 90% at 50% 118%,
				rgb(251 146 60 / calc(var(--gg-orange) * var(--gg-color-scale))),
				transparent 74%
			),
			radial-gradient(
				ellipse 90% 115% at -12% 48%,
				rgb(34 211 238 / calc(var(--gg-cyan) * var(--gg-color-scale))),
				transparent 78%
			),
			radial-gradient(
				ellipse 70% 70% at 90% 90%,
				rgb(244 114 182 / calc(var(--gg-pink) * var(--gg-color-scale))),
				transparent 68%
			);
		--gg-gradient: var(--gg-glow-gradient);
		transition:
			--gg-halo-inset 420ms cubic-bezier(0.22, 1, 0.36, 1),
			--gg-halo-blur 420ms cubic-bezier(0.22, 1, 0.36, 1),
			--gg-halo-opacity 420ms cubic-bezier(0.22, 1, 0.36, 1),
			--gg-border-opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
		animation:
			gg-aura-magenta 7.2s ease-in-out infinite,
			gg-aura-indigo 9.4s ease-in-out -1.8s infinite,
			gg-aura-orange 8.1s ease-in-out -0.9s infinite,
			gg-aura-cyan 10.6s ease-in-out -3.2s infinite,
			gg-aura-pink 6.8s ease-in-out -0.4s infinite;
	}

	:global(.light) .gg-card {
		--gg-color-scale: 0.72;
		--gg-halo-opacity: 0.24;
		--gg-border-opacity: 0.65;
		--gg-noise-opacity: 0.34;
		--gg-glow-noise-opacity: 0.42;
	}

	.gg-card:hover,
	.gg-card:focus-visible {
		--gg-halo-inset: 10px;
		--gg-halo-blur: 11px;
		--gg-halo-opacity: 0.34;
		--gg-border-opacity: 0.96;
	}

	:global(.light) .gg-card:hover,
	:global(.light) .gg-card:focus-visible {
		--gg-halo-opacity: 0.34;
		--gg-border-opacity: 0.78;
	}

	.gg-layer {
		z-index: 0;
	}

	.gg-content {
		position: relative;
		z-index: 1;
	}

	.gg-ambient,
	.gg-halo {
		position: absolute;
		pointer-events: none;
		background: var(--gg-glow-gradient);
		border-radius: calc(0.5rem + var(--gg-halo-inset));
		transition:
			inset 420ms cubic-bezier(0.22, 1, 0.36, 1),
			border-radius 420ms cubic-bezier(0.22, 1, 0.36, 1),
			filter 420ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.gg-ambient {
		inset: calc(var(--gg-halo-inset) * -1.8);
		opacity: calc(var(--gg-halo-opacity) * 0.18);
		filter: blur(calc(var(--gg-halo-blur) * 1.6));
	}

	.gg-halo {
		inset: calc(var(--gg-halo-inset) * -1);
		opacity: var(--gg-halo-opacity);
		filter: blur(var(--gg-halo-blur));
	}

	.gg-glow-noise {
		position: absolute;
		inset: calc(var(--gg-halo-inset) * -2.2);
		border-radius: calc(0.5rem + var(--gg-halo-inset));
		pointer-events: none;
		opacity: var(--gg-glow-noise-opacity);
		mix-blend-mode: soft-light;
		background-image: var(--gg-noise-fine), var(--gg-noise-coarse);
		background-size:
			120px 120px,
			200px 200px;
		filter: blur(5px);
		-webkit-mask-image: var(--gg-glow-gradient);
		mask-image: var(--gg-glow-gradient);
		transition:
			inset 420ms cubic-bezier(0.22, 1, 0.36, 1),
			border-radius 420ms cubic-bezier(0.22, 1, 0.36, 1),
			filter 420ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.gg-border {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		padding: 1px;
		pointer-events: none;
		opacity: var(--gg-border-opacity);
		background: var(--gg-gradient);
		transition: opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
		-webkit-mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		mask-composite: exclude;
	}

	.gg-noise {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		padding: 1px;
		pointer-events: none;
		opacity: var(--gg-noise-opacity);
		mix-blend-mode: overlay;
		background-image: var(--gg-noise-fine), var(--gg-noise-coarse);
		background-size:
			140px 140px,
			220px 220px;
		-webkit-mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		mask-composite: exclude;
		transition: opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.gg-surface {
		position: absolute;
		inset: 1px;
		border-radius: calc(0.5rem - 1px);
		background: hsl(var(--background));
	}

	@keyframes gg-aura-magenta {
		0%,
		100% {
			--gg-magenta: 0.92;
		}
		28% {
			--gg-magenta: 0.28;
		}
		52% {
			--gg-magenta: 0.62;
		}
		76% {
			--gg-magenta: 0.38;
		}
	}

	@keyframes gg-aura-indigo {
		0%,
		100% {
			--gg-indigo: 0.34;
		}
		24% {
			--gg-indigo: 0.88;
		}
		48% {
			--gg-indigo: 0.42;
		}
		72% {
			--gg-indigo: 0.74;
		}
	}

	@keyframes gg-aura-orange {
		0%,
		100% {
			--gg-orange: 0.4;
		}
		30% {
			--gg-orange: 0.78;
		}
		55% {
			--gg-orange: 0.9;
		}
		80% {
			--gg-orange: 0.32;
		}
	}

	@keyframes gg-aura-cyan {
		0%,
		100% {
			--gg-cyan: 0.82;
		}
		22% {
			--gg-cyan: 0.36;
		}
		50% {
			--gg-cyan: 0.68;
		}
		78% {
			--gg-cyan: 0.9;
		}
	}

	@keyframes gg-aura-pink {
		0%,
		100% {
			--gg-pink: 0.3;
		}
		35% {
			--gg-pink: 0.72;
		}
		62% {
			--gg-pink: 0.48;
		}
		88% {
			--gg-pink: 0.86;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.gg-card {
			transition: none;
			animation: none;
		}

		.gg-halo,
		.gg-ambient,
		.gg-glow-noise,
		.gg-border,
		.gg-noise {
			transition: none;
		}
	}
</style>
