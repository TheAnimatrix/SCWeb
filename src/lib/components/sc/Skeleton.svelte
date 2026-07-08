<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		animate?: boolean;
	}

	let { class: className, animate = true, ...restProps }: Props = $props();
</script>

<div
	class={cn(animate ? 'sc-stripes-animate' : 'sc-stripes', className)}
	aria-hidden="true"
	{...restProps}>
</div>
