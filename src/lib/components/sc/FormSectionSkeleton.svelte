<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface Props {
		fields?: number;
	}

	let { fields = 3 }: Props = $props();
</script>

<div class="space-y-4" aria-hidden="true">
	<section class="rounded-md border border-border bg-card p-4">
		<div class="space-y-4">
			{#each [...Array(fields).keys()] as i (i)}
				<div class="space-y-1.5">
					<Skeleton class="h-3 w-16 rounded-sm" />
					<Skeleton class="h-9 w-full rounded-md" />
				</div>
			{/each}
		</div>
	</section>

	<section class="rounded-md border border-border bg-card p-4">
		<Skeleton class="mb-3 h-3 w-20 rounded-sm" />
		<div class="space-y-3">
			<Skeleton class="h-9 w-full rounded-md" />
			<Skeleton class="h-9 w-full rounded-md" />
			<Skeleton class="h-9 w-full rounded-md" />
		</div>
	</section>

	<Skeleton class="h-9 w-full rounded-md" />
</div>
