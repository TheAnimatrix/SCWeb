<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		material: string;
		quality: string;
		scale: number;
		strengthLabel: string;
		infill: number;
		color?: string;
		class?: string;
	}

	let { material, quality, scale, strengthLabel, infill, color, class: className }: Props = $props();

	const qualityShort = $derived(quality.split(' ')[0].toLowerCase());
</script>

<div
	class={cn(
		'flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2',
		className
	)}
>
	<span class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">config</span>
	<span class="font-mono text-xs text-foreground">{material}</span>
	<span class="text-muted-foreground" aria-hidden="true">·</span>
	<span class="font-mono text-xs text-foreground">{qualityShort}</span>
	<span class="text-muted-foreground" aria-hidden="true">·</span>
	<span class="font-mono text-xs text-foreground">{scale.toFixed(2)}x</span>
	<span class="text-muted-foreground" aria-hidden="true">·</span>
	<span class="font-mono text-xs text-foreground">{strengthLabel} ({infill}%)</span>
	{#if color}
		<span class="text-muted-foreground" aria-hidden="true">·</span>
		<span
			class="inline-flex items-center gap-1.5 font-mono text-xs text-foreground"
			title="Selected filament color"
		>
			<span
				class="size-3 rounded-sm border border-border"
				style="background-color: {color}"
			></span>
			color
		</span>
	{/if}
</div>
