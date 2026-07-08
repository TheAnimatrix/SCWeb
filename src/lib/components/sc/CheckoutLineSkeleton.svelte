<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface Props {
		count?: number;
	}

	let { count = 3 }: Props = $props();
</script>

<div class="space-y-3" aria-hidden="true">
	{#each [...Array(count).keys()] as i (i)}
		<div
			class="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
			<div class="flex min-w-0 flex-1 items-center gap-3">
				<Skeleton class="size-6 shrink-0 rounded-full" />
				<Skeleton class="size-10 shrink-0 rounded-md" />
				<div class="min-w-0 flex-1 space-y-1.5">
					<Skeleton class="h-4 w-3/4 max-w-[160px] rounded-sm" />
					<Skeleton class="h-3 w-1/2 max-w-[100px] rounded-sm" />
				</div>
			</div>
			<Skeleton class="h-4 w-14 shrink-0 rounded-sm" />
		</div>
	{/each}
</div>
