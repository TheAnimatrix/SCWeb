<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface Props {
		count?: number;
	}

	let { count = 3 }: Props = $props();
</script>

<div class="space-y-3" aria-hidden="true">
	{#each Array(count) as _, i (i)}
		<Skeleton class="h-16 rounded-md border border-border" />
	{/each}
</div>
