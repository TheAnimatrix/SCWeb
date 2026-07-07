<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		items: string[];
		class?: string;
	}

	let { items, class: className }: Props = $props();
</script>

<ul class={cn('space-y-2 text-sm text-muted-foreground', className)}>
	{#each items as item (item)}
		<li class="flex items-start gap-2">
			<span class="mt-0.5 shrink-0 font-mono text-foreground" aria-hidden="true">✓</span>
			<span>{item}</span>
		</li>
	{/each}
</ul>
