<script lang="ts">
	import { ABOUT_STRINGS } from '$lib/constants/strings';
	
	// Maker ecosystem benefits
	const makerBenefits = [
		{
			title: "Maker-to-Maker Economy",
			icon: "💼",
			desc: "Connect directly with other makers and eliminate middlemen for better compensation."
		},
		{
			title: "Scaling Assistance",
			icon: "📈",
			desc: "Access resources to grow your crafting business from hobby to sustainable income."
		},
		{
			title: "Customer Feedback",
			icon: "💬",
			desc: "Receive real-time insights from your audience to improve your creations."
		},
		{
			title: "DIY Revolution",
			icon: "⚒️",
			desc: "Be part of the movement redefining how handmade goods are valued in the marketplace."
		}
	];
	
	// Crafter tiers from best to starter
	const crafterTiers = [
		{
			name: "Osprey",
			icon: "🦅",
			color: "#c2ff00",
			desc: "Master craftspeople with exceptional reputation and verified excellence.",
			benefits: ["Premium visibility", "Dedicated support", "Early feature access", "Commission freedom"]
		},
		{
			name: "Tiger",
			icon: "🐯",
			color: "#ff9900",
			desc: "Established creators with proven track record and consistent quality.",
			benefits: ["Featured in collections", "Priority support", "Higher visibility", "Reduced fees"]
		},
		{
			name: "Rhino",
			icon: "🦏",
			color: "#cccccc",
			desc: "Skilled makers with growing reputation and reliable craftsmanship.",
			benefits: ["Increased exposure", "Community spotlight", "Special events access", "Verified badge"]
		},
		{
			name: "Peacock",
			icon: "🦚",
			color: "#00c2ff",
			desc: "Emerging talents with promising skills and positive customer feedback.",
			benefits: ["Mentorship access", "Growth resources", "Community support", "Learning materials"]
		},
		{
			name: "Bee",
			icon: "🐝",
			color: "#ffec00",
			desc: "Starting craftspeople taking their first steps in the maker economy.",
			benefits: ["Onboarding support", "Basic tools", "Community access", "Learning resources"]
		}
	];
</script>

<div class="min-h-screen bg-[#0c0c0c] text-white overflow-hidden">
	<!-- SECTION 1: MAKER ECOSYSTEM -->
	<section class="pt-16 pb-24 px-4 relative">
		<!-- Glowing accent -->
		<div class="absolute top-20 left-1/2 w-96 h-96 bg-accent opacity-10 blur-[120px] -translate-x-1/2 rounded-full"></div>
		
		<!-- Heading -->
		<div class="text-center mb-20 relative z-10">
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-4 h-4 rounded-full bg-accent mr-2"></span>
				<span class="text-accent text-sm uppercase tracking-wider font-medium">What we're doing</span>
			</div>
			<h1 class="text-4xl md:text-5xl font-bold max-w-4xl mx-auto leading-tight">
				Kickstarting the indie
				<span class="block">maker economy.</span>
			</h1>
		</div>
		
		<!-- Benefits Grid -->
		<div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Maker Marketplace Card -->
			<div class="bg-[#151515] rounded-2xl p-6 border border-[#252525] hover:border-[#353535] transition-all">
				<h3 class="text-accent text-xl font-bold mb-4">Maker Marketplace</h3>
				<div class="text-lg font-medium mt-4">
					Buy and sell both finished products and critical components
				</div>
			</div>
			
			<!-- Local Sourcing Card -->
			<div class="bg-[#151515] rounded-2xl p-6 border border-[#252525] hover:border-[#353535] transition-all">
				<div class="flex justify-between mb-4">
					<div class="flex items-center space-x-2">
						<span class="text-xs text-white py-1 px-2 rounded bg-[#252525]">LOCAL FIRST</span>
					</div>
				</div>
				
				
				<h3 class="text-xl font-bold mb-3">Local Sourcing</h3>
				<p class="text-gray-400">Reduce dependency on expensive imports by connecting with local component makers.</p>
			</div>
			
			<!-- Maker Community Card -->
			<div class="bg-[#151515] rounded-2xl p-6 border border-[#252525] hover:border-[#353535] transition-all">
				<h3 class="text-xl font-bold mb-4">Maker Community</h3>
				<p class="text-gray-400 mt-4">
					Join a network of indie creators solving common sourcing and scaling challenges together.
				</p>
			</div>
		</div>
		
		<!-- Features Grid -->
		<div class="max-w-7xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Creator Tools -->
			<div class="bg-[#151515] rounded-2xl p-6 border border-[#252525] hover:border-[#353535] transition-all">
				<h3 class="text-xl font-bold mb-3">Creator Tools</h3>
				<p class="text-gray-400 mb-4">Explore and learn about specialized resources to design, manufacture, and market your innovations with our connections.</p>
				
				<div class="flex space-x-3 mt-8">
					<div class="w-8 h-8 rounded-lg bg-[#252525] flex items-center justify-center">
						<span class="text-[#ff3366]">🎨</span>
					</div>
					<div class="w-8 h-8 rounded-lg bg-[#252525] flex items-center justify-center">
						<span>📝</span>
					</div>
					<div class="w-8 h-8 rounded-lg bg-[#252525] flex items-center justify-center">
						<span class="text-[#00c2ff]">🔧</span>
					</div>
				</div>
			</div>
			
			<!-- Gamified Experience -->
			<div class="bg-[#151515] rounded-2xl p-6 border border-[#252525] hover:border-[#353535] transition-all">
				<h3 class="text-xl font-bold mb-3">Gamified Experience</h3>
				<p class="text-gray-400 mb-4">Earn recognition and unlock benefits as you grow your maker business.</p>
				
				<div class="flex mt-8 relative">
					<div class="w-10 h-10 rounded-full bg-[#8844ff] border-2 border-[#151515] flex items-center justify-center z-30">
						<span>👩‍🎨</span>
					</div>
					<div class="w-10 h-10 rounded-full bg-[#00c2ff] border-2 border-[#151515] flex items-center justify-center -ml-2 z-20">
						<span>👨‍🔧</span>
					</div>
					<div class="w-10 h-10 rounded-full bg-accent border-2 border-[#151515] flex items-center justify-center -ml-2 z-10">
						<span>👩‍💻</span>
					</div>
					<div class="w-10 h-10 rounded-full bg-[#151515] border-2 border-[#252525] flex items-center justify-center -ml-2 text-xs font-bold">
						+3
					</div>
				</div>
			</div>
		</div>
		
		<!-- Features Tags -->
		<div class="max-w-5xl mx-auto mt-16 flex flex-wrap justify-center gap-3">
			<div class="bg-[#151515] border border-[#252525] rounded-full px-4 py-2 flex items-center">
				<span class="w-2 h-2 bg-accent rounded-full mr-2"></span>
				<span>Component Sourcing</span>
			</div>
			<div class="bg-[#151515] border border-[#252525] rounded-full px-4 py-2 flex items-center">
				<span class="w-2 h-2 bg-accent rounded-full mr-2"></span>
				<span>Niche Products</span>
			</div>
			<div class="bg-[#151515] border border-[#252525] rounded-full px-4 py-2 flex items-center">
				<span class="w-2 h-2 bg-accent rounded-full mr-2"></span>
				<span>Maker Storefront</span>
			</div>
			<div class="bg-[#151515] border border-[#252525] rounded-full px-4 py-2 flex items-center">
				<span class="w-2 h-2 bg-accent rounded-full mr-2"></span>
				<span>Import Alternatives</span>
			</div>
			<div class="bg-[#151515] border border-[#252525] rounded-full px-4 py-2 flex items-center">
				<span class="w-2 h-2 bg-accent rounded-full mr-2"></span>
				<span>Small-batch Production</span>
			</div>
			<div class="bg-[#151515] border border-[#252525] rounded-full px-4 py-2 flex items-center">
				<span class="w-2 h-2 bg-accent rounded-full mr-2"></span>
				<span>Creator Support</span>
			</div>
			<div class="bg-[#151515] border border-[#252525] rounded-full px-4 py-2 flex items-center">
				<span class="w-2 h-2 bg-accent rounded-full mr-2"></span>
				<span>Innovation Network</span>
			</div>
		</div>
	</section>

	<!-- SECTION 2: CRAFTER TIERS -->
	<section class="pt-24 pb-32 px-4 relative">
		<!-- Glowing accent -->
		<div class="absolute top-40 right-20 w-96 h-96 bg-[#ff9900] opacity-10 blur-[120px] rounded-full"></div>
		<div class="absolute  bottom-40 left-20 w-96 h-96 bg-accent opacity-[8%] blur-[120px] rounded-full"></div>
		
		<!-- Heading -->
		<div class="text-center mb-20 relative z-10">
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-4 h-4 rounded-full bg-accent mr-2"></span>
				<span class="text-accent text-sm uppercase tracking-wider font-medium">How it works</span>
			</div>
			<h2 class="text-4xl font-bold max-w-4xl mx-auto leading-tight">
				Your journey from hobbyist
				<span class="block">to established creator.</span>
			</h2>
		</div>
		
		<!-- Tier Cards -->
		<div class="max-w-7xl mx-auto mb-8">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				{#each crafterTiers.slice(0, 3) as tier, i}
					<div class="bg-[#151515] rounded-2xl p-6 border border-[#252525] hover:border-{tier.color}30 transition-all">
						<div class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-4 border border-{tier.color}30" style="background-color: {tier.color}15;">
							{tier.icon}
						</div>
						<h3 class="text-2xl font-bold mb-2" style="color: {tier.color};">{tier.name}</h3>
						<p class="text-gray-400 mb-6">{tier.desc}</p>
						
						<ul class="space-y-2">
							{#each tier.benefits as benefit}
								<li class="flex items-center">
									<span class="w-2 h-2 rounded-full mr-2" style="background-color: {tier.color};"></span>
									<span class="text-sm">{benefit}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
				{#each crafterTiers.slice(3) as tier, i}
					<div class="bg-[#151515] rounded-2xl p-6 border border-[#252525] hover:border-[#0000030] transition-all">
						<div class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-4 border border-[#0000030]" style="background-color: #0000015;">
							{tier.icon}
						</div>
						<h3 class="text-2xl font-bold mb-2" style="color: {tier.color};">{tier.name}</h3>
						<p class="text-gray-400 mb-6">{tier.desc}</p>
						
						<ul class="space-y-2">
							{#each tier.benefits as benefit}
								<li class="flex items-center">
									<span class="w-2 h-2 rounded-full mr-2" style="background-color: {tier.color};"></span>
									<span class="text-sm">{benefit}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		</div>
		
		<!-- CTA -->
		<div class="max-w-5xl mx-auto mt-20 text-center">
			<h3 class="text-2xl font-bold mb-6">Ready to join the maker revolution?</h3>
			<button class="bg-accent text-black px-8 py-3 rounded-lg font-bold hover:bg-white transition-colors">
				<a href="/crafting">Become a Crafter Today</a>
			</button>
		</div>
	</section>
</div>

<style>
	/* Any additional styles can go here */
</style>
