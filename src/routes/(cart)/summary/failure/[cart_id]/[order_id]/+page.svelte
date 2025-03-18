<script lang="ts">
	import { page } from '$app/stores';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from '@iconify/svelte';
</script>

<div class="min-h-screen bg-[#0c0c0c] text-white">
	<div class="container mx-auto px-4 py-12">
		<!-- Page Header -->
		<div class="text-center mb-10" in:fly="{{ y: -20, duration: 600, delay: 200, easing: cubicOut }}">
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-4 h-4 rounded-full bg-red-500 mr-2"></span>
				<span class="text-red-500 text-sm uppercase tracking-wider font-medium">Payment Failed</span>
			</div>
			<h1 class="text-4xl font-bold mb-4">Payment Unsuccessful</h1>
			<p class="text-gray-400">We were unable to process your payment</p>
		</div>

		<!-- Order Details -->
		<div class="max-w-2xl mx-auto">
			<div class="bg-[#1c1c1c] rounded-lg p-6 mb-6" in:fly="{{ y: 20, duration: 600, delay: 400, easing: cubicOut }}">
				<h2 class="text-xl font-semibold mb-4 flex items-center">
					<Icon icon="mdi:information-outline" class="mr-2 text-red-500" width="24" />
					Transaction Details
				</h2>
				
				<div class="space-y-4">
					<div class="flex justify-between items-center py-2 border-b border-gray-700">
						<span class="text-gray-400">Order ID</span>
						<button
							class="text-blue-400 hover:text-blue-300 transition-colors flex items-center"
							on:click={() => {navigator.clipboard.writeText($page.params.cart_id); alert('copied to clipboard');}}>
							#{$page.params.cart_id}
							<Icon icon="mdi:content-copy" class="ml-2" width="16" />
						</button>
					</div>
					
					<div class="flex justify-between items-center py-2 border-b border-gray-700">
						<span class="text-gray-400">Payment ID</span>
						<button
							class="text-blue-400 hover:text-blue-300 transition-colors flex items-center"
							on:click={() => {navigator.clipboard.writeText($page.params.order_id); alert('copied to clipboard');}}>
							#{$page.params.order_id}
							<Icon icon="mdi:content-copy" class="ml-2" width="16" />
						</button>
					</div>
				</div>
			</div>

			<div class="bg-[#1c1c1c] rounded-lg p-6" in:fly="{{ y: 20, duration: 600, delay: 600, easing: cubicOut }}">
				<h2 class="text-xl font-semibold mb-4 flex items-center">
					<Icon icon="mdi:help-circle-outline" class="mr-2 text-red-500" width="24" />
					Need Help?
				</h2>
				
				<p class="text-gray-400 mb-4">
					If any money was deducted from your account, please contact our support team with a screenshot 
					of this page and we will initiate a refund immediately.
				</p>

				<button
					on:click={() =>
						window.open(
							`mailto:support@selfcrafted.in?subject=Failed%20payment%20with%20orderId%20%23${$page.params.cart_id}%20and%20paymentId%20%23${$page.params.order_id}`,
							'_blank'
						)}
					class="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-lg transition-colors flex items-center justify-center">
					<Icon icon="mdi:email-outline" class="mr-2" width="20" />
					Contact Support
				</button>
			</div>
		</div>
	</div>
</div>
