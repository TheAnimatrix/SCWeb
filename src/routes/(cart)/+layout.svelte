<script lang="ts">
	import { run } from 'svelte/legacy';

	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
	import IconCheckout from '$lib/svg/icon-checkout.svelte';
	import IconOrderSummary from '$lib/svg/icon-order-summary.svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let currentPage = $state('cart');

	let id: string | undefined = $state();

	run(() => {
		id = page.route.id?.replace('/(cart)', '');
		if (id?.startsWith('/cart')) {
			currentPage = 'cart';
		} else if (id?.startsWith('/checkout')) {
			currentPage = 'checkout';
		} else if (id?.startsWith('/summary')) {
			currentPage = 'summary';
		}
	});
</script>

<div class="flex flex-col text-white justify-center mx-auto">
	<div class="w-[55%] max-sm:w-[95%] max-md:w-[90%] max-lg:w-[85%] max-2xl:w-[75%] mx-auto">
		{@render children?.()}
	</div>
</div>

<style>
	* {
		@apply transition-all duration-200 ease-linear;
	}
</style>
