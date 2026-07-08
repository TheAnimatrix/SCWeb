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

	let {
		material,
		quality,
		scale,
		strengthLabel,
		infill,
		color,
		class: className
	}: Props = $props();

	const qualityLabel = $derived(quality.split(' ')[0]);
</script>

<div
	class={cn('rounded-lg border border-border bg-muted/20 px-4 py-3', className)}
	aria-label="Current print configuration">
	<p class="mb-2.5 text-xs font-medium text-muted-foreground">Current configuration</p>
	<dl class="grid grid-cols-2 gap-x-3 gap-y-3">
		<div class="min-w-0">
			<dt class="text-[11px] leading-none text-muted-foreground">Material</dt>
			<dd class="mt-1 break-words text-sm font-medium text-foreground">{material}</dd>
		</div>
		<div class="min-w-0">
			<dt class="text-[11px] leading-none text-muted-foreground">Quality</dt>
			<dd class="mt-1 break-words text-sm font-medium text-foreground">{qualityLabel}</dd>
		</div>
		<div class="min-w-0">
			<dt class="text-[11px] leading-none text-muted-foreground">Scale</dt>
			<dd class="mt-1 break-words text-sm font-medium tabular-nums text-foreground">
				{scale.toFixed(2)}×
			</dd>
		</div>
		<div class="min-w-0">
			<dt class="text-[11px] leading-none text-muted-foreground">Strength</dt>
			<dd class="mt-1 break-words text-sm font-medium text-foreground">
				{strengthLabel} ({infill}%)
			</dd>
		</div>
		{#if color}
			<div class="col-span-2 min-w-0">
				<dt class="text-[11px] leading-none text-muted-foreground">Filament color</dt>
				<dd class="mt-1 flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
					<span
						class="size-4 shrink-0 rounded-sm border border-border shadow-sm"
						style="background-color: {color}"
						aria-hidden="true"></span>
					<span class="min-w-0 break-words">Selected</span>
				</dd>
			</div>
		{/if}
	</dl>
</div>
