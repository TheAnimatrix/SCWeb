<script lang="ts">
	import { page } from '$app/stores';
</script>

<div
	class="flex flex-col justify-center md:items-center mt-8 w-full md:mx-4 bg-red-950 rounded-md border-red-500 border-[1px] p-4">
	<div class="text-2xl">Payment failed</div>
	<div class="h-2"></div>
	<div>
		<span class="font-bold">Order ID</span> : &nbsp;&nbsp;<button
			class="text-blue-300"
			on:click={() => {navigator.clipboard.writeText($page.params.cart_id); alert('copied to clipboard');}}
			>#{$page.params.cart_id}</button>
	</div>
	<div class="mt-2">
		<span class="font-bold">Payment ID</span> : &nbsp;&nbsp;
		<button
			class="text-blue-300"
			on:click={() => {navigator.clipboard.writeText($page.params.order_id); alert('copied to clipboard');}}
			>#{$page.params.order_id}</button>
	</div>
</div>

<div
	class="flex flex-col justify-center md:items-center mt-2 w-full md:mx-4 bg-red-950 rounded-md border-red-500 border-[1px] p-4">
	<div class="md:text-center">
		Payment has failed due to some circumstances, if any money was deducted from your account please
		contact us with a screenshot of this if possible and we will initiate a refund: 
        <button
			on:click={() =>
				window.open(
					`mailto:support@selfcrafted.in?subject=Failed%20payment%20with%20orderId%20%23${$page.params.cart_id}%20and%20paymentId%20%23${$page.params.order_id}`,
					'_blank'
				)}
			class="text-blue-400 inline">support@selfcrafted.in</button>
	</div>
	<div class="mt-2 text-xl">No worries, We are here to help you!</div>
</div>
