<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';
	import IconCheckout from '$lib/svg/icon-checkout.svelte';
	import IconOrderSummary from '$lib/svg/icon-order-summary.svelte';

	let currentPage = 'cart';

	let id: string | undefined;

	$: {
		id = $page.route.id?.replace('/(cart)', '');
		if (id?.startsWith('/cart')) {
			currentPage = 'cart';
		} else if (id?.startsWith('/checkout')) {
			currentPage = 'checkout';
		} else if (id?.startsWith('/summary')) {
			currentPage = 'summary';
		}
	}
</script>

<div class="flex flex-col text-white justify-center mx-auto">
	<div class="w-[55%] max-sm:w-[95%] max-md:w-[90%] max-lg:w-[85%] max-2xl:w-[75%] mx-auto">
		<slot />
	</div>
</div>

<style lang="postcss">
	* {
		@apply transition-all duration-200 ease-linear;
	}
</style>
