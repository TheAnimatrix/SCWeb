<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cn } from '$lib/utils';
	import { getTabFadeOut, getTabFlyIn } from '$lib/utils/tabTransition';
	import type { Snippet } from 'svelte';

	interface Props {
		tabKey: string | number;
		class?: string;
		children: Snippet;
	}

	let { tabKey, class: className, children }: Props = $props();
</script>

{#key tabKey}
	<div class={cn('tab-panel-transition', className)} in:fly={getTabFlyIn()} out:fade={getTabFadeOut()}>
		{@render children()}
	</div>
{/key}
