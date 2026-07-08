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
	onclick={(event) => toggleTheme(event)}
>
	<span class="relative grid size-4 place-items-center" aria-hidden="true">
		<Sun
			class={cn(
				'absolute size-4 shrink-0 transition-all duration-500 ease-out',
				isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
			)}
		/>
		<Moon
			class={cn(
				'absolute size-4 shrink-0 transition-all duration-500 ease-out',
				isDark ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
			)}
		/>
	</span>
</button>
