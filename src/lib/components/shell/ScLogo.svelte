<script lang="ts">
	import Logo from '$lib/svg/logo_main.svg';
	import { cn } from '$lib/utils';

	interface Props {
		/** light = dark logo on white bg, dark = light logo on black bg */
		variant?: 'light' | 'dark';
		class?: string;
	}

	let { variant = 'light', class: className }: Props = $props();
</script>

<img
	src={Logo}
	alt="selfcrafted.in"
	class={cn(
		'h-8 w-auto',
		variant === 'light' && 'logo-light',
		variant === 'dark' && 'logo-dark',
		className
	)}
/>

<style>
	.logo-light {
		/* near-black wordmark with subtle teal on the mark */
		filter: brightness(0) saturate(100%) invert(8%) sepia(12%) saturate(1200%)
			hue-rotate(128deg) brightness(95%);
	}

	.logo-dark {
		/* soft white with faint teal accent on the mark */
		filter: brightness(0) saturate(100%) invert(100%) sepia(8%) saturate(400%)
			hue-rotate(118deg) brightness(105%);
	}
</style>
