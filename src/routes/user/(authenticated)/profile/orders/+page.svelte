<script lang="ts">
	import type { Order, Orders, Product } from '$lib/types/product.js';
	import {} from '$lib/client/loading.js';
	import type { CartItem } from '$lib/client/cart.js';

	export let data;
	let supabase_lt = data.supabase_lt;

	let subload = false;

	let orders: Orders = [];
	orders = data.orders;
	let visible = Array(orders.length).fill(true);

	function getDate(timestamp: string) {
		const date = new Date();
		const day = date.getDate();
		const suffix = getDaySuffix(day);
		const month = date.toLocaleDateString('en-US', { month: 'long' });
		const year = date.getFullYear();

		return `${day}${suffix} ${month} ${year}`;
	}

	function getDaySuffix(day: number) {
		if (day >= 11 && day <= 13) {
			return 'th';
		}

		const lastDigit = day % 10;

		switch (lastDigit) {
			case 1:
				return 'st';
			case 2:
				return 'nd';
			case 3:
				return 'rd';
			default:
				return 'th';
		}
	}
	function getTime(timestamp: string) {
		return new Date(timestamp).toLocaleTimeString('en-IN', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	async function getCartDetails(
		id: string | null
	): Promise<{ cart: CartItem[] | undefined; products: Product[] | undefined, shipping:number,price:number}> {
		if (!id) return {cart:undefined,products:undefined,price:0,shipping:0};
		const cartResult = await supabase_lt.from('cart').select().eq('id', id);
		if (cartResult.error || cartResult.data.length <= 0 || cartResult.data?.[0].list.length <= 0)
		return {cart:undefined,products:undefined,price:0,shipping:0};
		const productList: Product[] = [];
		let total = 0;
		for (let cart of cartResult.data?.[0].list) {
			total += cart.price;
			const productResult = await supabase_lt.from('products').select().eq('id', cart.product_id);
			if (productResult.error || productResult.data.length <= 0) return {cart:undefined,products:undefined,price:0,shipping:0};
			productResult.data[0].qty = cart.qty;
			productList.push(productResult.data[0]);
		}
		return { cart: cartResult.data[0].list, products: productList, shipping:cartResult.data[0].price-total, price:cartResult.data[0].price};
	}
</script>

<div class="flex flex-col w-full">
	<div class="flex flex-col lhead">
		<div class="litem">
			<div>Order #</div>
			<div>Status</div>
			<div>Date</div>
			<div>Amount</div>
		</div>
	</div>
	<div class="flex flex-col mt-4 lhead">
		{#if orders == undefined || orders.length <= 0 || subload}
			{#if subload}
				<div class="p-4 text-center">Loading...</div>
			{:else}
				<div class="p-4 text-center">No orders placed</div>
			{/if}
		{:else}
			{#each orders as order, i}
				<button
					class="litem rounded-b-xl"
					on:click={() => {
						visible[i] = !visible[i];
					}}>
					<div>{order.id}</div>
					<div class="capitalize font-bold">{order.payment_status}</div>
					<div>
						<div>{getDate(order.created_at)}</div>
						<div>{getTime(order.created_at)}</div>
					</div>
					<div>₹{order.amount}</div>
				</button>
				<div
					id="oreveal-{i}"
					class="bg-scoranged1 animate_base {visible[i]
						? 'show'
						: 'noshow'} max-h-[300px] rounded-b-xl">
					{#await getCartDetails(order.cart_id)}
						<div class="p-4 text-center">Loading...</div>
					{:then list}
						{#if list.cart == undefined || list.products == undefined || list.cart.length <= 0 || list.products.length <= 0}
							<div class="p-4 text-center rounded-b-xl">Unable to fetch order information</div>
						{:else}
							<div class="flex flex-col overflow-y-scroll no-scrollbar rounded-b-xl">
								<hr class="border-orange-300 border-opacity-15">
								{#each list.cart as item, i}
									<a href="/{order.cart_id}/craft/item={item.product_id}" class="hover:text-scorangel0  grid grid-cols-3 p-2 items-center text-center bg-scoranged3 bg-opacity-5 ">
										<div class="font-bold underline animate_base">{list.products[i].name} <span class="font-normal">(₹{item.price})</span></div>
										<div><span class="font-bold">{item.qty} unit</span></div>
										<div>₹{item.price * item.qty}</div>
									</a>
									<hr class="border-orange-300 border-opacity-15">
								{/each}
								<div class="grid grid-cols-3 p-2 items-center text-center bg-scoranged3 bg-opacity-5 ">
									<div >Shipping</div>
									<div></div>
									<div>₹{list.shipping}</div>
								</div>
								<hr class="border-orange-300 border-opacity-15">
								<div class="grid grid-cols-3 pt-2 pb-4 items-center text-center bg-scoranged3 bg-opacity-5 rounded-b-xl">
									<div >Total</div>
									<div></div>
									<div>₹{list.price}</div>
								</div>
							</div>
						{/if}
					{/await}
				</div>
				{#if i < orders.length - 1}
					<hr class="border-orange-300 border-opacity-50">
				{/if}
			{/each}
		{/if}
	</div>
</div>

<style lang="postcss">
	.lhead {
		@apply border-[1px] border-solid border-orange-300 bg-scoranged2 rounded-xl text-orange-200 text-opacity-75;
	}

	.litem {
		@apply animate_base bg-scoranged2 hover:bg-scorange hover:bg-opacity-10 p-4 text-orange-200 text-opacity-75 grid grid-flow-col grid-cols-4 gap-x-4 max-sm:text-sm text-center;
	}

	.litem:first-child,
	.litem:last-child {
		@apply rounded-xl;
	}
	.noshow {
		@apply !invisible !max-h-0 !border-0 !m-0 !opacity-0;
	}
	/* Hide scrollbar for Chrome, Safari and Opera */
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}

	/* Hide scrollbar for IE, Edge and Firefox */
	.no-scrollbar {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}
</style>
