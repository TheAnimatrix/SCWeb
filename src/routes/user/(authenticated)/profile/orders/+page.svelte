<script lang="ts">
	import type { Order,Orders } from '$lib/stores/types/product';
	import { loading } from '$lib/stores/loading';

	export let data;
	let supabase_lt = data.supabase_lt;

	let subload = false;

	let orders : Orders = [];
	async function getOrders() {
		subload = true;
		orders = (await supabase_lt.from('purchases').select()).data as Orders;
		subload = false;
	}

	function getDate(timestamp: string) {
		return new Date(timestamp).toLocaleString('en-IN').split(',')[0];
	}

	function getTime(timestamp: string) {
		return new Date(timestamp).toLocaleString('en-IN').split(',')[1];
	}

	if(supabase_lt)
	getOrders();
</script>

<div class="flex flex-col w-[65%]">
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
				<div class="litem">
					<div>{order.id}</div>
					<div>Delivered</div>
					<div>
						<div>{getDate(order.created_at)}</div>
						<div>{getTime(order.created_at)}</div>
					</div>
					<div>₹{order.amount}</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style lang="postcss">
	.lhead {
		@apply border-[1px] border-solid border-orange-300 bg-scoranged2 rounded-xl text-orange-200 text-opacity-75;
	}

	.litem {
		@apply bg-scoranged2 p-2 text-orange-200 text-opacity-75 grid grid-flow-col auto-cols-fr break-words text-center;
	}

	.litem:nth-child(even) {
		@apply bg-scoranged1;
	}

	.lhead > * {
		@apply p-4;
	}

	.litem:first-child,
	.litem:last-child {
		@apply rounded-xl;
	}
</style>
