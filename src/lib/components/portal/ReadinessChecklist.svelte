<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { cn } from '$lib/utils';
		
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
					<Icon icon={F.check} class="size-3.5 shrink-0 text-foreground" />
					<span class="text-foreground">{item.label}</span>
				{:else}
					<Icon icon={F.circle} class="size-3.5 shrink-0 text-muted-foreground" />
					<span class="text-muted-foreground">{item.label}</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>
