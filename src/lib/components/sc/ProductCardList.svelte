<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = HTMLAttributes<HTMLUListElement> & {
		class?: string;
		children: Snippet;
	};

	let { class: className, children, ...rest }: Props = $props();
</script>

<ul
	class={cn(
		'm-0 grid w-full list-none',
		'grid-cols-[repeat(auto-fit,minmax(min(100%,9.5rem),1fr))]',
		'md:grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]',
		'lg:grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]',
		'gap-3 p-0 lg:gap-4',
		className
	)}
	{...rest}>
	{@render children()}
</ul>
