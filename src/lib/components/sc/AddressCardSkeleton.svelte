<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface Props {
		count?: number;
	}

	let { count = 2 }: Props = $props();
</script>

<div class="space-y-3" aria-hidden="true">
	{#each Array(count) as _, i (i)}
		<div class="rounded-md border border-border bg-card p-4">
			<Skeleton class="mb-2 h-4 w-1/3 rounded-sm" />
			<div class="space-y-2">
				<Skeleton class="h-3 w-5/6 rounded-sm" />
				<Skeleton class="h-3 w-2/3 rounded-sm" />
			</div>
		</div>
	{/each}
</div>
