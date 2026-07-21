<script lang="ts">
	import { cn } from '$lib/utils';
	import Skeleton from './Skeleton.svelte';

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();
</script>

<article
		class={cn(
		'flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card',
		className
	)}
	aria-hidden="true">
	<Skeleton class="aspect-[4/3] w-full shrink-0 rounded-none border-0" />
	<div class="flex flex-1 flex-col gap-1.5 p-3">
		<Skeleton class="h-4 w-3/4 rounded-sm" />
		<Skeleton class="h-2.5 w-1/2 rounded-sm" />
		<div class="flex flex-wrap gap-1">
			<Skeleton class="h-4 w-10 rounded-md" />
			<Skeleton class="h-4 w-12 rounded-md" />
			<Skeleton class="h-4 w-9 rounded-md" />
		</div>
		<div class="mt-auto flex items-center justify-between gap-2 pt-1">
			<Skeleton class="h-3 w-1/4 rounded-sm" />
			<Skeleton class="h-4 w-1/4 rounded-sm" />
		</div>
	</div>
</article>
