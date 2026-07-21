<script lang="ts">
	import Logo from '$lib/svg/logo_main.svg';
	import LogoMark from '$lib/svg/logo_mark.svg';
	import { cn } from '$lib/utils';

	interface Props {
		/** light = dark logo on white bg, dark = light logo on black bg */
		variant?: 'light' | 'dark';
		/** icon-only mark (no wordmark) */
		mark?: boolean;
		class?: string;
	}

	let { variant = 'light', mark = false, class: className }: Props = $props();
</script>

<img
	src={mark ? LogoMark : Logo}
	alt="selfcrafted.in"
	class={cn('h-8 w-auto', variant === 'light' && 'logo-light', className)} />

<style>
	.logo-light {
		filter: invert(1);
	}
</style>
