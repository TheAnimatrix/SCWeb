<script lang="ts">
	import Icon from '@iconify/svelte';
	import IconCheckout from '$lib/svg/icon-checkout.svelte';
	import IconOrderSummary from '$lib/svg/icon-order-summary.svelte';
	
	
</script>

<div class="flex flex-wrap mt-4 gap-x-3 mb-4">
	<div class="cart flex flex-col flex-[3_0_66%] gap-y-4 mb-4">
		{#each Array(2) as _, i}
			<div class="bg-scblued2 p-2 rounded-xl">
				<div class="cart-item flex border-[1px] border-scblue rounded-lg">
					<div>
						<img src="/images/lornode_pp2.jpg" class="min-h-full max-h-[180px] aspect-[1.2] rounded-lg object-cover" alt="" />
					</div>
					<div class="flex-1 flex flex-col p-4 max-sm:p-2">
						<div class="max-sm:text-xl text-3xl font-bold">Lornode</div>
						<div class="max-sm:text-sm text-xl font-bold text-scblue">by Animatrix</div>
						<div class="flex-1"></div>
						<div class="max-sm:hidden text-xs font-bold text-scbluel0 opacity-60">
							15 days SCOriginal Guarantee
						</div>
					</div>
					<div
						class="flex flex-wrap text-center gap-x-8 gap-y-2 mr-8 my-4 max-sm:my-2 max-sm:mx-2 max-sm:gap-x-4 h-fit items-end justify-end"
					>
						<div class="text-xl max-sm:text-md">₹899</div>
						<div>
							<input
								type="number"
								placeholder="3"
								class="min-w-[50px] w-[50px] bg-scblued1 text-center border-[1px] border-scblue rounded-md placeholder-scblue"
							/>
						</div>
						<div class="font-bold text-xl max-sm:text-lg">₹2697</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
	<div class="flex-[1_1_25%]">
		<div class="w-full bg-scblued2 p-2 rounded-xl">
			<div class="flex flex-col bg-scblued1 w-full rounded-xl border-scblue border-[1px] py-2">
				<div class="flex justify-between px-3 pb-2">
					<div class="mt-2">Subtotal</div>
					<div class="mt-2">₹2999</div>
				</div>
				<div class="px-3 py-2 bg-scblued3">
					<input
						placeholder="pincode"
						class="bg-transparent border-scblue border-[1px] py-1 px-2 rounded-lg w-fit "
					/>
				</div>
				<div class="flex justify-between py-2 px-3 bg-scblued3">
					<div>Shipping</div>
					<div>₹99</div>
				</div>
				<div class="flex justify-between mt-2 py-2 px-3">
					<div class="text-xl font-bold">Total</div>
					<div class="text-xl font-bold">₹3098</div>
				</div>
			</div>
		</div>
	</div>
</div>
