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
		'overflow-hidden rounded-lg border border-border bg-card',
		className
	)}
	aria-hidden="true"
>
	<Skeleton class="aspect-[4/3] w-full rounded-none border-0" />
	<div class="flex flex-col gap-2 p-4">
		<Skeleton class="h-4 w-3/4 rounded-sm" />
		<Skeleton class="h-3 w-1/2 rounded-sm" />
		<Skeleton class="mt-1 h-5 w-1/4 rounded-sm" />
	</div>
</article>
