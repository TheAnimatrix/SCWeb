<script lang="ts">
	import Roadmap from '$lib/components/page/roadmap.svelte';
	import snarkdown from 'snarkdown';
	import { ABOUT_STRINGS } from '$lib/constants/strings';
	let origin = ABOUT_STRINGS.origin;
	let privacy = ABOUT_STRINGS.privacy;
	let terms = ABOUT_STRINGS.terms;
	let cancellation = ABOUT_STRINGS.cancellation;
	let shipping = ABOUT_STRINGS.shipping;
	let contact = ABOUT_STRINGS.contact;
	let roadmap = ABOUT_STRINGS.roadmap;
	let risks = ABOUT_STRINGS.risks;
	let currentSelection: number = 0;
	import * as Card from '$lib/components/ui/card';
</script>

<div class="text-white flex flex-col text-center mt-8">
	<span class="font-bold text-2xl mx-4">Policy</span>
	<div class="mt-8 w-full flex flex-col justify-center items-center">
		<div id="privacy" class="flex flex-col justify-center items-center w-[65%] max-lg:w-[90%]">
			<Card.Root class="bg-[#131819] border-none text-white text-left mb-4 max-lg:mb-3 w-full">
				<Card.Header>
					<Card.Title class="text-2xl">Privacy Policy</Card.Title>
				</Card.Header>
				<Card.Content>
					{@html snarkdown(privacy)}
				</Card.Content>
			</Card.Root>
		</div>
		<div id="terms" class="flex flex-col justify-center items-center w-[65%] max-lg:w-[90%]">
			<Card.Root class="bg-[#131819] border-none text-white text-left mb-4 max-lg:mb-3 w-full">
				<Card.Header>
					<Card.Title class="text-2xl">Terms & Conditions</Card.Title>
				</Card.Header>
				<Card.Content>
					{@html snarkdown(terms)}
				</Card.Content>
			</Card.Root>
		</div>
		<div id="cancellation" class="flex flex-col justify-center items-center w-[65%] max-lg:w-[90%]">
			<Card.Root class="bg-[#131819] border-none text-white text-left mb-4 max-lg:mb-3 w-full">
				<Card.Header>
					<Card.Title class="text-2xl">Cancellation & Refund</Card.Title>
				</Card.Header>
				<Card.Content>
					{@html snarkdown(cancellation)}
				</Card.Content>
			</Card.Root>
		</div>
		<div id="shipping" class="flex flex-col justify-center items-center w-[65%] max-lg:w-[90%]">
			<Card.Root class="bg-[#131819] border-none text-white text-left mb-4 max-lg:mb-3 w-full">
				<Card.Header>
					<Card.Title class="text-2xl">Shipping & Delivery</Card.Title>
				</Card.Header>
				<Card.Content>
					{@html snarkdown(shipping)}
				</Card.Content>
			</Card.Root>
		</div>
		<div id="contact" class="flex flex-col justify-center items-center w-[65%] max-lg:w-[90%]">
			<Card.Root class="bg-[#131819] border-none text-white text-left mb-4 max-lg:mb-3 w-full">
				<Card.Header>
					<Card.Title class="text-2xl">Contact Us</Card.Title>
				</Card.Header>
				<Card.Content>
					{@html snarkdown(contact)}
				</Card.Content>
			</Card.Root>
		</div>
		<div id="risks" class="flex flex-col justify-center items-center w-[65%] max-lg:w-[90%]">
			<Card.Root class="bg-[#131819] border-none text-white text-left mb-4 max-lg:mb-3 w-full">
				<Card.Header>
					<Card.Title class="text-2xl">Risks</Card.Title>
				</Card.Header>
				<Card.Content>
					{@html snarkdown(risks)}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>

<style lang="postcss">
	.category {
		@apply mt-6 text-xl text-[#9D9D9D] font-semibold ease-linear transition-all duration-200;
	}

	.selected-category {
		@apply font-bold text-2xl bg-opacity-20 rounded-[38px] bg-black p-4 text-white;
	}

	#privacy {
		scroll-margin: 16rem;
	}

	#terms {
		scroll-margin: 16rem;
	}

	#cancellation {
		scroll-margin: 16rem;
	}

	#shipping {
		scroll-margin: 16rem;
	}

	#contact {
		scroll-margin: 16rem;
	}

	#risks {
		scroll-margin: 16rem;
	}
</style>
