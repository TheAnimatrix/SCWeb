<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		children?: import('svelte').Snippet;
		[key: string]: unknown;
	}

	let { class: className = undefined, children, ...rest }: Props = $props();
</script>

<div class={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)} {...rest}>
	{@render children?.()}
</div>
