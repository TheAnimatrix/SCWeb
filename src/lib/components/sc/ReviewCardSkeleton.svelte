<script lang="ts">
	import Skeleton from './Skeleton.svelte';
</script>

<div class="mt-2 space-y-3" aria-hidden="true">
	<div class="flex items-center gap-1">
		{#each [...Array(5).keys()] as i (i)}
			<Skeleton class="size-4 rounded-sm" />
		{/each}
	</div>
	<div class="space-y-2">
		<Skeleton class="h-3 w-full rounded-sm" />
		<Skeleton class="h-3 w-4/5 rounded-sm" />
	</div>
	<div class="flex gap-2">
		<Skeleton class="h-8 w-24 rounded-md" />
		<Skeleton class="h-8 w-28 rounded-md" />
	</div>
</div>
