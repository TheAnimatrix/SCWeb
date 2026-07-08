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
	class={cn('h-8 w-auto', variant === 'light' && 'logo-light', className)} />

<style>
	.logo-light {
		filter: invert(1);
	}
</style>
