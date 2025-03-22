<script lang="ts">
	import Roadmap from '$lib/components/page/roadmap.svelte';
	import snarkdown from 'snarkdown';
	import { ABOUT_STRINGS } from '$lib/constants/strings';
	import Icon from '@iconify/svelte';
	let origin = ABOUT_STRINGS.origin;
	let privacy = ABOUT_STRINGS.privacy;
	let terms = ABOUT_STRINGS.terms;
	let cancellation = ABOUT_STRINGS.cancellation;
	let shipping = ABOUT_STRINGS.shipping;
	let contact = ABOUT_STRINGS.contact;
	let roadmap = ABOUT_STRINGS.roadmap;
	let risks = ABOUT_STRINGS.risks;
	let currentSelection: number = $state(0);
	import * as Card from '$lib/components/ui/card';
</script>

<div class="min-h-screen bg-[#0c0c0c] text-white py-12">
	<div class="container mx-auto px-4">
		<!-- Header -->
		<div class="text-center mb-12">
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-3 h-3 rounded-full bg-accent mr-2"></span>
				<span class="text-accent text-sm uppercase tracking-wider font-medium">Legal & Policies</span>
			</div>
			<h1 class="text-4xl font-bold mb-3">Our Policies</h1>
			<p class="text-gray-400 max-w-2xl mx-auto">Everything you need to know about our terms, policies, and procedures.</p>
		</div>

		<!-- Quick Navigation -->
		<div class="flex flex-wrap justify-center gap-3 mb-12">
			{#each ['Privacy Policy', 'Terms & Conditions', 'Cancellation & Refund', 'Shipping & Delivery', 'Contact Us', 'Risks'] as section, i}
				<button
					class="{`
						px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105
						${currentSelection === i ? 'bg-accent/10 text-accent' : 'bg-[#151515]/40 text-gray-400'}
					`}"
					onclick={() => {
						currentSelection = i;
						document.getElementById(['privacy', 'terms', 'cancellation', 'shipping', 'contact', 'risks'][i])?.scrollIntoView({ behavior: 'smooth' });
					}}
				>
					{section}
				</button>
			{/each}
		</div>

		<!-- Policy Content -->
		<div class="max-w-4xl mx-auto space-y-8">
			<div id="privacy" class="policy-section">
				<Card.Root class="bg-[#151515]/40 backdrop-blur-xs border-[#252525] text-white text-left mb-8 w-full hover:shadow-glow transition-all duration-300">
					<Card.Header class="border-b border-[#252525] p-6">
						<Card.Title class="text-2xl flex items-center gap-3">
							<Icon icon="ph:shield-check-bold" class="text-accent opacity-80" />
							Privacy Policy
						</Card.Title>
					</Card.Header>
					<Card.Content class="p-6 prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white">
						{@html snarkdown(privacy)}
					</Card.Content>
				</Card.Root>
			</div>

			<div id="terms" class="policy-section">
				<Card.Root class="bg-[#151515]/40 backdrop-blur-xs border-[#252525] text-white text-left mb-8 w-full hover:shadow-glow transition-all duration-300">
					<Card.Header class="border-b border-[#252525] p-6">
						<Card.Title class="text-2xl flex items-center gap-3">
							<Icon icon="ph:book-bold" class="text-accent opacity-80" />
							Terms & Conditions
						</Card.Title>
					</Card.Header>
					<Card.Content class="p-6 prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white">
						{@html snarkdown(terms)}
					</Card.Content>
				</Card.Root>
			</div>

			<div id="cancellation" class="policy-section">
				<Card.Root class="bg-[#151515]/40 backdrop-blur-xs border-[#252525] text-white text-left mb-8 w-full hover:shadow-glow transition-all duration-300">
					<Card.Header class="border-b border-[#252525] p-6">
						<Card.Title class="text-2xl flex items-center gap-3">
							<Icon icon="ph:arrow-counter-clockwise-bold" class="text-accent opacity-80" />
							Cancellation & Refund
						</Card.Title>
					</Card.Header>
					<Card.Content class="p-6 prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white">
						{@html snarkdown(cancellation)}
					</Card.Content>
				</Card.Root>
			</div>

			<div id="shipping" class="policy-section">
				<Card.Root class="bg-[#151515]/40 backdrop-blur-xs border-[#252525] text-white text-left mb-8 w-full hover:shadow-glow transition-all duration-300">
					<Card.Header class="border-b border-[#252525] p-6">
						<Card.Title class="text-2xl flex items-center gap-3">
							<Icon icon="ph:truck-bold" class="text-accent opacity-80" />
							Shipping & Delivery
						</Card.Title>
					</Card.Header>
					<Card.Content class="p-6 prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white">
						{@html snarkdown(shipping)}
					</Card.Content>
				</Card.Root>
			</div>

			<div id="contact" class="policy-section">
				<Card.Root class="bg-[#151515]/40 backdrop-blur-xs border-[#252525] text-white text-left mb-8 w-full hover:shadow-glow transition-all duration-300">
					<Card.Header class="border-b border-[#252525] p-6">
						<Card.Title class="text-2xl flex items-center gap-3">
							<Icon icon="ph:phone-bold" class="text-accent opacity-80" />
							Contact Us
						</Card.Title>
					</Card.Header>
					<Card.Content class="p-6 prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white">
						{@html snarkdown(contact)}
					</Card.Content>
				</Card.Root>
			</div>

			<div id="risks" class="policy-section">
				<Card.Root class="bg-[#151515]/40 backdrop-blur-xs border-[#252525] text-white text-left mb-8 w-full hover:shadow-glow transition-all duration-300">
					<Card.Header class="border-b border-[#252525] p-6">
						<Card.Title class="text-2xl flex items-center gap-3">
							<Icon icon="ph:warning-circle-bold" class="text-accent opacity-80" />
							Risks
						</Card.Title>
					</Card.Header>
					<Card.Content class="p-6 prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white">
						{@html snarkdown(risks)}
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
</div>

<style>
	.shadow-glow {
		box-shadow: 0 4px 20px -5px rgba(194, 255, 0, 0.1);
	}

	.policy-section {
		scroll-margin: 8rem;
	}

	:global(.prose) {
		max-width: none;
	}

	:global(.prose h1, .prose h2, .prose h3, .prose h4) {
		color: white;
		margin-top: 2em;
		margin-bottom: 1em;
	}

	:global(.prose p) {
		color: #9ca3af;
		margin-bottom: 1.5em;
	}

	:global(.prose ul, .prose ol) {
		color: #9ca3af;
		margin-bottom: 1.5em;
	}

	:global(.prose a) {
		text-decoration: none;
	}

	:global(.prose a:hover) {
		text-decoration: underline;
	}
</style>
