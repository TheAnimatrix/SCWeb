<script lang="ts">
	import SparklePixels from '$lib/components/effects/SparklePixels.svelte';
	import { cn } from '$lib/utils';

	type Rgb = readonly [number, number, number];

	interface Props {
		title: string;
		description: string;
		index?: number;
		class?: string;
	}

	const FLAVORS: { palette: readonly Rgb[]; glow: string }[] = [
		{
			glow: '255, 80, 220',
			palette: [
				[255, 0, 255],
				[255, 45, 180],
				[220, 60, 255],
				[160, 80, 255],
				[255, 120, 220],
				[255, 255, 255]
			]
		},
		{
			glow: '0, 220, 255',
			palette: [
				[0, 220, 255],
				[40, 200, 245],
				[80, 170, 255],
				[0, 255, 210],
				[120, 230, 255],
				[255, 255, 255]
			]
		},
		{
			glow: '255, 175, 45',
			palette: [
				[255, 175, 45],
				[255, 130, 35],
				[255, 215, 90],
				[255, 95, 55],
				[255, 200, 120],
				[255, 255, 255]
			]
		}
	];

	let { title, description, index = 0, class: className }: Props = $props();

	let hovered = $state(false);

	const flavor = $derived(FLAVORS[index % FLAVORS.length]);
</script>

<article
	class={cn(
		'group relative flex flex-col gap-2 overflow-hidden border-r border-border bg-background px-6 py-6 last:border-r-0',
		className
	)}
	style:--glow-rgb={flavor.glow}
	onmouseenter={() => (hovered = true)}
	onmouseleave={() => (hovered = false)}
>
	<div
		class="pointer-events-none absolute inset-0 z-0 bg-background transition-[clip-path] duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
		style:clip-path={hovered ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)'}
		aria-hidden="true"
	>
		<SparklePixels active={hovered} intensity={0.58} palette={flavor.palette} />
	</div>

	<h3 class="feature-glow-title relative z-10 text-base font-medium text-foreground" class:is-glowing={hovered}>
		{title}
	</h3>
	<p
		class="feature-glow-desc relative z-10 text-sm leading-relaxed text-muted-foreground"
		class:is-glowing={hovered}
	>
		{description}
	</p>
</article>

<style>
	.feature-glow-title,
	.feature-glow-desc {
		transition:
			text-shadow 1.4s cubic-bezier(0.16, 1, 0.3, 1),
			color 1.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.feature-glow-title.is-glowing {
		color: hsl(var(--foreground));
		text-shadow:
			0 0 8px rgba(var(--glow-rgb), 0.95),
			0 0 18px rgba(var(--glow-rgb), 0.65),
			0 0 36px rgba(var(--glow-rgb), 0.35);
	}

	.feature-glow-desc.is-glowing {
		color: hsl(var(--foreground) / 0.82);
		text-shadow:
			0 0 6px rgba(var(--glow-rgb), 0.7),
			0 0 14px rgba(var(--glow-rgb), 0.4);
	}

	@media (prefers-reduced-motion: reduce) {
		.feature-glow-title,
		.feature-glow-desc {
			transition: none;
		}
	}
</style>
