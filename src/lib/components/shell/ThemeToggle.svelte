<script lang="ts">
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { theme, toggleTheme } from '$lib/client/theme';
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		mobile?: boolean;
	}

	let { class: className, mobile = false }: Props = $props();

	const isDark = $derived($theme === 'dark');
</script>

<button
	type="button"
	class={cn(
		'inline-flex items-center justify-center text-foreground transition-colors hover:text-foreground/80',
		mobile ? 'size-9' : 'size-8',
		className
	)}
	aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
	onclick={toggleTheme}
>
	{#if isDark}
		<Sun class="size-4 shrink-0" aria-hidden="true" />
	{:else}
		<Moon class="size-4 shrink-0" aria-hidden="true" />
	{/if}
</button>
