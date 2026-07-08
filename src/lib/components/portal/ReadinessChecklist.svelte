<script lang="ts">
	import { cn } from '$lib/utils';
	import Check from '@lucide/svelte/icons/check';
	import Circle from '@lucide/svelte/icons/circle';

	interface Item {
		label: string;
		done: boolean;
	}

	interface Props {
		items: Item[];
		class?: string;
	}

	let { items, class: className }: Props = $props();

	const allDone = $derived(items.every((item) => item.done));
</script>

<div
	class={cn(
		'rounded-md border px-4 py-3',
		allDone ? 'border-foreground/20 bg-muted/20' : 'border-border bg-card',
		className
	)}>
	<p class="mb-2 text-xs font-medium text-muted-foreground">Before requesting a quote</p>
	<ul class="space-y-1.5">
		{#each items as item (item.label)}
			<li class="flex items-center gap-2 text-sm">
				{#if item.done}
					<Check class="size-3.5 shrink-0 text-foreground" strokeWidth={2} />
					<span class="text-foreground">{item.label}</span>
				{:else}
					<Circle class="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
					<span class="text-muted-foreground">{item.label}</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>
