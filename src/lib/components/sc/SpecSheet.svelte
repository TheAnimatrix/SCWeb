<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		title?: string;
		specs: Record<string, string>;
		class?: string;
	}

	let { title = 'Details', specs, class: className }: Props = $props();

	const entries = $derived(Object.entries(specs));
</script>

{#if entries.length > 0}
	<div class={cn('overflow-hidden rounded-lg border border-border bg-card', className)}>
		{#if title}
			<div class="border-b border-border px-4 py-2.5 text-sm font-medium text-foreground">
				{title}
			</div>
		{/if}
		<dl class="divide-y divide-border">
			{#each entries as [key, value] (key)}
				<div class="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 px-4 py-2.5 text-sm">
					<dt class="capitalize text-muted-foreground">{key.replaceAll('_', ' ')}</dt>
					<dd class="text-foreground">{value}</dd>
				</div>
			{/each}
		</dl>
	</div>
{/if}
