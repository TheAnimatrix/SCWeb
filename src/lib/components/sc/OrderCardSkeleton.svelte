<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface Props {
		count?: number;
	}

	let { count = 3 }: Props = $props();
</script>

<div class="overflow-hidden rounded-md border border-border" aria-hidden="true">
	<div
		class="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] gap-3 border-b border-border bg-secondary/30 px-3 py-2"
	>
		<Skeleton class="h-3 w-6 rounded-sm" />
		<Skeleton class="h-3 w-10 rounded-sm" />
		<Skeleton class="h-3 w-8 rounded-sm" />
		<Skeleton class="h-3 w-12 rounded-sm justify-self-end" />
	</div>

	<div class="divide-y divide-border">
		{#each Array(count) as _, i (i)}
			<div
				class="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] gap-3 px-3 py-3"
			>
				<Skeleton class="h-4 w-16 rounded-sm" />
				<Skeleton class="h-4 w-20 rounded-sm" />
				<Skeleton class="h-4 w-24 rounded-sm" />
				<Skeleton class="h-4 w-12 rounded-sm justify-self-end" />
			</div>
		{/each}
	</div>
</div>
