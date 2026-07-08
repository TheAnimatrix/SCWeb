<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface Props {
		chips?: number;
	}

	let { chips = 6 }: Props = $props();
</script>

<div class="flex flex-wrap gap-2" aria-hidden="true">
	{#each [...Array(chips).keys()] as i (i)}
		<Skeleton class="h-8 w-16 rounded-md" />
	{/each}
</div>
