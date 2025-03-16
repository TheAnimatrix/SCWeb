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
			desc: "The pinnacle of maker excellence, creating exceptional products that define standards in their niche.",
			benefits: ["Premium visibility", "Dedicated support", "Early feature access", "Commission freedom"]
		},
		{
			name: "Tiger",
			icon: "🐯",
			color: "#ff9900",
			desc: "Established creators who consistently deliver quality and build sustainable maker businesses.",
			benefits: ["Featured in collections", "Priority support", "Higher visibility", "Reduced fees"]
		},
		{
			name: "Rhino",
			icon: "🦏",
			color: "#cccccc",
			desc: "Experienced makers who've turned their passion into recognized craftsmanship and expertise.",
			benefits: ["Increased exposure", "Community spotlight", "Special events access", "Verified badge"]
		},
		{
			name: "Peacock",
			icon: "🦚",
			color: "#00c2ff",
			desc: "Promising talents developing their unique style with growing customer appreciation.",
			benefits: ["Mentorship access", "Growth resources", "Community support", "Learning materials"]
		},
		{
			name: "Bee",
			icon: "🐝",
			color: "#ffec00",
			desc: "Every great maker starts here - newcomers with passion ready to join the creator economy.",
			benefits: ["Onboarding support", "Basic tools", "Community access", "Learning resources"]
		}
	];
</script>

<div class="min-h-screen bg-[#0c0c0c] text-white overflow-hidden">
	<!-- SECTION 1: MAKER ECOSYSTEM -->
	<section class="pt-16 pb-24 px-4 relative">
		<!-- Glowing accent -->
		<div class="absolute top-20 left-1/2 w-96 h-96 bg-[#c2ff00] opacity-10 blur-[120px] -translate-x-1/2 rounded-full"></div>
		
		<!-- Heading -->
		<div class="text-center mb-20 relative z-10">
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-4 h-4 rounded-full bg-[#c2ff00] mr-2"></span>
				<span class="text-[#c2ff00] text-sm uppercase tracking-wider font-medium">What you'll get</span>
			</div>
			<h1 class="text-4xl md:text-5xl font-bold max-w-4xl mx-auto leading-tight">
				Connecting indie makers with
				<span class="block">parts, products, and people.</span>
			</h1>
		</div>
		
		<!-- Benefits Grid -->
		<div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Maker Marketplace Card -->
			<div class="bg-[#151515] rounded-2xl p-6 border border-[#252525] hover:border-[#353535] transition-all">
				<h3 class="text-[#c2ff00] text-xl font-bold mb-4">Maker Marketplace</h3>
				<div class="h-48 flex items-center justify-center">
					<svg class="w-full h-full" viewBox="0 0 200 100">
						<!-- Stylized bar chart (keeping the same visual) -->
						<rect x="10" y="70" width="8" height="20" fill="#c2ff00" rx="2" />
						<rect x="25" y="50" width="8" height="40" fill="#c2ff00" rx="2" />
						<rect x="40" y="60" width="8" height="30" fill="#c2ff00" rx="2" />
						<rect x="55" y="30" width="8" height="60" fill="#c2ff00" rx="2" />
						<rect x="70" y="45" width="8" height="45" fill="#c2ff00" rx="2" />
						<rect x="85" y="20" width="8" height="70" fill="#c2ff00" rx="2" />
						<rect x="100" y="40" width="8" height="50" fill="#c2ff00" rx="2" />
						<rect x="115" y="25" width="8" height="65" fill="#c2ff00" rx="2" />
						<rect x="130" y="35" width="8" height="55" fill="#c2ff00" rx="2" />
						<rect x="145" y="15" width="8" height="75" fill="#c2ff00" rx="2" />
						<rect x="160" y="25" width="8" height="65" fill="#c2ff00" rx="2" />
						<rect x="175" y="10" width="8" height="80" fill="#c2ff00" rx="2" />
					</svg>
				</div>
				<div class="text-lg font-medium mt-4">
					Buy and sell both finished products and critical components
				</div>
			</div>
			
			<!-- Local Sourcing Card -->
			<div class="bg-[#151515] rounded-2xl p-6 border border-[#252525] hover:border-[#353535] transition-all">
				<div class="flex justify-between mb-8">
					<div class="flex items-center space-x-2">
						<span class="text-xs text-white py-1 px-2 rounded bg-[#252525]">LOCAL FIRST</span>
					</div>
				</div>
				
				<div class="bg-[#1c1c1c] rounded-xl p-4 mb-6">
					<div class="flex items-center space-x-3 mb-3">
						<div class="w-8 h-8 rounded-full bg-[#252525] flex items-center justify-center">
							<span class="text-[#c2ff00]">🔄</span>
						</div>
						<div>
							<div class="text-white font-medium">Reduce imports</div>
							<div class="text-gray-400 text-sm">Source locally</div>
						</div>
					</div>
				</div>
				
				<h3 class="text-xl font-bold mb-3">Local Sourcing</h3>
				<p class="text-gray-400">Reduce dependency on expensive imports by connecting with local component makers.</p>
			</div>
			
			<!-- Maker Community Card -->
			<div class="bg-[#151515] rounded-2xl p-6 border border-[#252525] hover:border-[#353535] transition-all">
				<h3 class="text-xl font-bold mb-4">Maker Community</h3>
				<div class="h-48 flex items-center justify-center">
					<svg class="w-full h-full" viewBox="0 0 200 100">
						<!-- Stylized line chart (keeping the same visual) -->
						<path d="M10,80 Q30,75 50,65 T90,60 T130,40 T160,30 T190,10" stroke="#c2ff00" stroke-width="3" fill="none" />
						<circle cx="190" cy="10" r="5" fill="#c2ff00" />
					</svg>
				</div>
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
				<p class="text-gray-400 mb-4">Access specialized resources to design, manufacture, and market your innovations.</p>
				
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
					<div class="w-10 h-10 rounded-full bg-[#c2ff00] border-2 border-[#151515] flex items-center justify-center -ml-2 z-10">
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
				<span class="w-2 h-2 bg-[#c2ff00] rounded-full mr-2"></span>
				<span>Component Sourcing</span>
			</div>
			<div class="bg-[#151515] border border-[#252525] rounded-full px-4 py-2 flex items-center">
				<span class="w-2 h-2 bg-[#c2ff00] rounded-full mr-2"></span>
				<span>Niche Products</span>
			</div>
			<div class="bg-[#151515] border border-[#252525] rounded-full px-4 py-2 flex items-center">
				<span class="w-2 h-2 bg-[#c2ff00] rounded-full mr-2"></span>
				<span>Maker Storefront</span>
			</div>
			<div class="bg-[#151515] border border-[#252525] rounded-full px-4 py-2 flex items-center">
				<span class="w-2 h-2 bg-[#c2ff00] rounded-full mr-2"></span>
				<span>Import Alternatives</span>
			</div>
			<div class="bg-[#151515] border border-[#252525] rounded-full px-4 py-2 flex items-center">
				<span class="w-2 h-2 bg-[#c2ff00] rounded-full mr-2"></span>
				<span>Small-batch Production</span>
			</div>
			<div class="bg-[#151515] border border-[#252525] rounded-full px-4 py-2 flex items-center">
				<span class="w-2 h-2 bg-[#c2ff00] rounded-full mr-2"></span>
				<span>Creator Support</span>
			</div>
			<div class="bg-[#151515] border border-[#252525] rounded-full px-4 py-2 flex items-center">
				<span class="w-2 h-2 bg-[#c2ff00] rounded-full mr-2"></span>
				<span>Innovation Network</span>
			</div>
		</div>
	</section>

	<!-- SECTION 2: CRAFTER TIERS -->
	<section class="pt-24 pb-32 px-4 relative">
		<!-- Glowing accent -->
		<div class="absolute top-40 right-20 w-96 h-96 bg-[#ff9900] opacity-10 blur-[120px] rounded-full"></div>
		
		<!-- Heading -->
		<div class="text-center mb-20 relative z-10">
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-4 h-4 rounded-full bg-[#c2ff00] mr-2"></span>
				<span class="text-[#c2ff00] text-sm uppercase tracking-wider font-medium">How it works</span>
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
					<div class="bg-[#151515] rounded-2xl p-6 border border-[#252525] hover:border-[{tier.color}30] transition-all">
						<div class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-4 border border-[{tier.color}30]" style="background-color: {tier.color}15;">
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
					<div class="bg-[#151515] rounded-2xl p-6 border border-[#252525] hover:border-[{tier.color}30] transition-all">
						<div class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-4 border border-[{tier.color}30]" style="background-color: {tier.color}15;">
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
			<button class="bg-[#c2ff00] text-black px-8 py-3 rounded-lg font-bold hover:bg-white transition-colors">
				Become a Crafter Today
			</button>
		</div>
	</section>
</div>

<style>
	/* Any additional styles can go here */
</style>
