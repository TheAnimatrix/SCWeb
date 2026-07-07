<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface Props {
		count?: number;
	}

	let { count = 3 }: Props = $props();
</script>

<div class="space-y-3" aria-hidden="true">
	{#each Array(count) as _, i (i)}
		<div class="overflow-hidden rounded-md border border-border bg-card">
			<div class="grid grid-cols-2 gap-3 p-3 md:grid-cols-4 md:gap-4">
				{#each Array(4) as _, j (j)}
					<div class="space-y-1.5">
						<Skeleton class="h-3 w-8 rounded-sm" />
						<Skeleton class="h-4 w-20 rounded-sm" />
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>
