<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = HTMLAttributes<HTMLUListElement> & {
		class?: string;
		children: Snippet;
	};

	let { class: className, children, ...rest }: Props = $props();

	const columnClasses =
		'grid-cols-2 @min-[520px]:grid-cols-2 @min-[700px]:grid-cols-3 @min-[880px]:grid-cols-4 @min-[1060px]:grid-cols-5';
</script>

<div class="@container w-full">
	<ul
		class={cn(
			'm-0 grid w-full list-none',
			columnClasses,
			'gap-3 p-0 lg:gap-4',
			className
		)}
		{...rest}>
		{@render children()}
	</ul>
</div>
