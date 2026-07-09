<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface Props {
		count?: number;
	}

	let { count = 3 }: Props = $props();
</script>

<div class="contents" aria-hidden="true">
	{#each [...Array(count).keys()] as i (i)}
		<Skeleton class="h-36 rounded-lg border border-border" />
	{/each}
</div>
