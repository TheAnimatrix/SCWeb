<script lang="ts">
	import { page } from '$app/stores';
</script>

<div
	class="flex flex-col justify-center md:items-center  mt-8 w-full md:mx-4 bg-green-950 rounded-md border-green-500 border-[1px] p-4">
	<div class="text-2xl">Your order was successfully placed</div>
	<div class="h-2"></div>
	<div>
		<span class="font-bold">Order ID</span> : &nbsp;&nbsp;<button class="text-blue-300"
			on:click={() => navigator.clipboard.writeText($page.params.cart_id)}
		>#{$page.params.cart_id}</button>
	</div>
	<div class="mt-2">
		<span class="font-bold">Payment ID</span> : &nbsp;&nbsp; <button class="text-blue-300"
			on:click={() => navigator.clipboard.writeText($page.params.payment_id)}
		>#{$page.params.payment_id}</button>
	</div>
	<div class="h-4"></div>
	Order tracking details will be shared on the provided mobile number & email address
</div>

<div
	class="flex flex-col justify-center md:items-center mt-2 w-full md:mx-4 bg-green-950 rounded-md border-green-500 border-[1px] p-4">
	<div class="md:text-center">
		You can screesnhot this and share it with us, should you have any issues. Feel free to contact
		us if you have any questions : <a
			href="mailto:support@selfcrafted.in"
			class="text-blue-400 inline">support@selfcrafted.in</a>
	</div>
	<div class="mt-2 text-xl">Thank you for shopping with us!</div>
</div>
