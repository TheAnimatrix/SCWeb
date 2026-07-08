<script lang="ts">
	import { cn } from '$lib/utils';
	import Skeleton from './Skeleton.svelte';

	interface Props {
		lines?: number;
		class?: string;
	}

	let { lines = 6, class: className }: Props = $props();

	const widths = ['w-full', 'w-11/12', 'w-full', 'w-4/5', 'w-full', 'w-2/3'];
</script>

<div class={cn('space-y-2.5', className)} aria-hidden="true">
	{#each [...Array(lines).keys()] as i (i)}
		<Skeleton class={cn('h-3 rounded-sm', widths[i % widths.length])} />
	{/each}
</div>
