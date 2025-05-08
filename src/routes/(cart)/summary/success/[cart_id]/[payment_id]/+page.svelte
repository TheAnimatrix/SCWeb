<script lang="ts">
	import { page } from '$app/stores';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from '@iconify/svelte';
	import { toast } from 'svelte-sonner';
	import { toastStore } from '$lib/client/toastStore';
</script>

<div class="min-h-screen bg-[#0c0c0c] text-white">
	<div class="container mx-auto px-4 py-12">
		<!-- Page Header -->
		<div class="text-center mb-10" in:fly={{ y: -20, duration: 600, delay: 200, easing: cubicOut }}>
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-4 h-4 rounded-full bg-green-500 mr-2"></span>
				<span class="text-green-500 text-sm uppercase tracking-wider font-medium"
					>Order Confirmed</span>
			</div>
			<div class="text-4xl font-bold mb-4">Payment Successful</div>
			<p class="text-gray-400">Your order has been successfully placed</p>
		</div>

		<!-- Order Details -->
		<div class="max-w-2xl mx-auto">
			<div
				class="bg-[#1c1c1c] rounded-lg p-6 mb-6"
				in:fly={{ y: 20, duration: 600, delay: 400, easing: cubicOut }}>
				<div class="text-xl font-semibold mb-4 flex items-center">
					<Icon icon="mdi:check-circle-outline" class="mr-2 text-green-500" width="24" />
					Transaction Details
				</div>

				<div class="space-y-4">
					<div class="flex justify-between items-center py-2 border-b border-gray-700">
						<span class="text-gray-400">Order ID</span>
						<button
							class="text-green-400 hover:text-green-300 transition-colors flex items-center"
							onclick={() => {
								//doesn't work without https
								if(navigator.clipboard){
									navigator.clipboard.writeText($page.params.cart_id);
									toastStore.show('copied to clipboard', 'info');
								}else{
									toastStore.show('clipboard not supported on http', 'error');
								}
							}}>
							#{$page.params.cart_id}
							<Icon icon="mdi:content-copy" class="ml-2" width="16" />
						</button>
					</div>

					<div class="flex justify-between items-center py-2 border-b border-gray-700">
						<span class="text-gray-400">Payment ID</span>
						<button
							class="text-green-400 hover:text-green-300 transition-colors flex items-center"
							onclick={() => {
								//doesn't work without https
								if(navigator.clipboard){
									navigator.clipboard.writeText($page.params.payment_id);
									toastStore.show('copied to clipboard', 'info');
								}else{
									toastStore.show('clipboard not supported on http', 'error');
								}
							}}>
							#{$page.params.payment_id}
							<Icon icon="mdi:content-copy" class="ml-2" width="16" />
						</button>
					</div>

					<p class="text-gray-400 pt-2">
						Order tracking details will be shared on your registered mobile number & email address
					</p>
				</div>
			</div>

			<div
				class="bg-[#1c1c1c] rounded-lg p-6"
				in:fly={{ y: 20, duration: 600, delay: 600, easing: cubicOut }}>
				<div class="text-xl font-semibold mb-4 flex items-center">
					<Icon icon="mdi:help-circle-outline" class="mr-2 text-green-500" width="24" />
					Need Help?
				</div>

				<p class="text-gray-400 mb-4">
					You can take a screenshot of this page for your reference. If you have any questions or
					concerns, our support team is here to help.
				</p>

				<button
					onclick={() => window.open('mailto:support@selfcrafted.in', '_blank')}
					class="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg transition-colors flex items-center justify-center">
					<Icon icon="mdi:email-outline" class="mr-2" width="20" />
					Contact Support
				</button>
			</div>
		</div>
	</div>
</div>
