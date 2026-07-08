<script lang="ts">
	import { cn } from '$lib/utils';
	import Skeleton from './Skeleton.svelte';

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();
</script>

<article
	class={cn('overflow-hidden rounded-lg border border-border bg-card', className)}
	aria-hidden="true">
	<Skeleton class="aspect-[4/3] w-full rounded-none border-0" />
	<div class="flex flex-col gap-1.5 p-3">
		<Skeleton class="h-3.5 w-3/4 rounded-sm" />
		<Skeleton class="h-2.5 w-1/2 rounded-sm" />
		<Skeleton class="mt-0.5 h-4 w-1/4 rounded-sm" />
	</div>
</article>
