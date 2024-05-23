<script lang="ts">
	import {cartg} from '$lib/client/cart';
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
	<div class="flex flex-wrap text-xl justify-center items-center">
		<div class="flex items-center">
			<Icon
				icon="solar:cart-large-2-bold-duotone"
				class={currentPage == 'cart'
					? 'text-[200%] text-scblue'
					: 'text-[200%] text-scbluel0 opacity-50'}
			/>
			<span class={currentPage == 'cart' ? 'text-scbluel2 font-bold' : 'text-scbluel0 opacity-50'}
				>Cart</span
			>
		</div>
		<Icon icon="iconamoon:arrow-right-2-bold" class="text-[125%] mx-2" />
		<div class="flex items-center">
			<IconCheckout
				class={currentPage == 'checkout'
					? 'text-[200%] text-scblue'
					: 'text-[200%] text-scbluel0 opacity-50'}
			/>
			<span class={currentPage == 'checkout' ? 'text-scbluel2 font-bold' : 'text-scbluel0 opacity-50'}
				>Checkout</span
			>
		</div>
		<Icon icon="iconamoon:arrow-right-2-bold" class="text-[125%] mx-2" />
		<div class="flex items-center">
			<IconOrderSummary
			class={currentPage == 'summary'
				? 'text-[200%] text-scblue'
				: 'text-[200%] text-scbluel0 opacity-50'} />
			<span class={currentPage == 'summary' ? 'text-scbluel2 font-bold' : 'text-scbluel0 opacity-50'}>Order Summary</span>
		</div>
	</div>
	<div class="w-[55%] max-sm:w-[95%] max-md:w-[90%] max-lg:w-[85%] max-2xl:w-[75%] mx-auto">
		<slot />
	</div>
</div>

<style lang="postcss">
	* {
		@apply transition-all duration-200 ease-linear;
	}
</style>
