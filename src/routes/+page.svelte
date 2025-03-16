<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getContext, onMount, onDestroy } from 'svelte';
	import { writable, type Writable } from 'svelte/store';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Product } from '$lib/types/product';
	import { type Banner } from '$lib/client/banner';
	import BannerIndicator from '$lib/components/fundamental/banner_indicator.svelte';
	import ProductList from './product_list.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import Loader from '$lib/components/fundamental/Loader.svelte';

	export let data;

	let indicator_cur = 0;
	let cinterval = 5000; // 5 seconds between slides
	let autoplayInterval: ReturnType<typeof setInterval> | undefined;
	let smokeCanvas: HTMLCanvasElement;

	let getLink = (i: number, product: Product) => {
		return `/${product.name.replaceAll(' ', '_')}/craft/item=${product.id}`;
	};

	let image = writable('');
	let name: string, author: string, url: string;
	$: {
		if (data.banners?.[indicator_cur]?.img) {
			image.set(data.banners?.[indicator_cur].img);
			name = data.banners?.[indicator_cur].name;
			author = data.banners?.[indicator_cur].author;
			url = data.banners?.[indicator_cur].url;
		}
	}

	let products: Product[];
	let default_filter = "Products";

	let load_store = getContext<Writable<boolean>>('loading');

	let loading = false;
	async function setup(filterf:string|null) {
		loading = true;
		let filter = filterf ?? $page.url.searchParams.get('filter') ?? default_filter;
		let query = data.supabase_lt.from('products').select('*');
		if (filter) {
			if(filter == 'Products') {
				filter = 'product';
			} else if(filter == 'Spares') {
				filter = 'spare';
			} else if (filter == 'FleaMarket') {
				filter = 'flea-market';
			}
			if(filter != 'All') {
				query = query.eq('type', filter);
			}
		}
		let resp = await query;
		if (resp.error || !resp.data) {
			console.error(resp.error);
		} else {
			products = resp.data as Product[];
		}
		loading = false;
	}

	setup(null);

	// Highlight key aspects of SelfCrafted
	const keyFeatures = [
		{
			title: "Maker Marketplace",
			icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-10 h-10 feature-icon">
				<defs>
					<linearGradient id="storefront-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="#4CAF50" />
						<stop offset="100%" stop-color="#2E7D32" />
					</linearGradient>
					<linearGradient id="roof-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="#7C4DFF" />
						<stop offset="100%" stop-color="#512DA8" />
					</linearGradient>
					<linearGradient id="tech-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#00BCD4" />
						<stop offset="100%" stop-color="#006064" />
					</linearGradient>
				</defs>
				
				<!-- Storefront base with modern design -->
				<path d="M2 7h20v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Z" fill="url(#storefront-gradient)" stroke="#ffffff" stroke-width="1.5" class="storefront-base" />
				
				<!-- Stylized roof -->
				<path d="M1 7l2-4h18l2 4" fill="url(#roof-gradient)" stroke="#ffffff" stroke-width="1.5" class="storefront-roof" />
				
				<!-- Modern glass door -->
				<path d="M9 13h6v8h-6v-8" fill="#E3F2FD" stroke="#ffffff" stroke-width="1.5" class="storefront-door" />
				<path d="M11 17h2" stroke="#ffffff" stroke-width="1.5" opacity="0.8" />
				
				<!-- Tech product displays -->
				<rect x="4" y="9" width="2" height="2" rx="0.5" fill="#E1BEE7" stroke="#ffffff" stroke-width="1" class="product-item item-1" />
				<rect x="7" y="9" width="2" height="2" rx="0.5" fill="#B2EBF2" stroke="#ffffff" stroke-width="1" class="product-item item-2" />
				<rect x="15" y="9" width="2" height="2" rx="0.5" fill="#C8E6C9" stroke="#ffffff" stroke-width="1" class="product-item item-3" />
				<rect x="18" y="9" width="2" height="2" rx="0.5" fill="#FFE0B2" stroke="#ffffff" stroke-width="1" class="product-item item-4" />
				
				<!-- Circuit board design -->
				<path d="M4 13h2m1 0h1m4 4h1m1 0h2" stroke="url(#tech-gradient)" stroke-width="1.5" class="circuit-trace" />
				<circle cx="18" cy="15" r="1" fill="#00BCD4" stroke="#ffffff" stroke-width="0.5" class="circuit-node node-1" />
				<circle cx="5" cy="15" r="1" fill="#00BCD4" stroke="#ffffff" stroke-width="0.5" class="circuit-node node-2" />
				
				<!-- Digital elements -->
				<path d="M5 11l1-1m12 1l1-1" stroke="#ffffff" stroke-width="0.5" opacity="0.6" />
				<path d="M8 11l1-1m6 1l1-1" stroke="#ffffff" stroke-width="0.5" opacity="0.6" />
			</svg>`,
			desc: "Buy and sell both finished products and critical components in one platform."
		},
		{
			title: "Local Sourcing",
			icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-10 h-10 feature-icon">
				<defs>
					<linearGradient id="globe-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="#1976D2" />
						<stop offset="100%" stop-color="#0D47A1" />
					</linearGradient>
					<linearGradient id="land-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#4CAF50" />
						<stop offset="100%" stop-color="#2E7D32" />
					</linearGradient>
					<linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#FFA726" />
						<stop offset="100%" stop-color="#F57C00" />
					</linearGradient>
				</defs>
				
				<!-- World sphere with atmosphere effect -->
				<circle cx="12" cy="12" r="9" fill="url(#globe-gradient)" stroke="#ffffff" stroke-width="1.5" class="world-map" />
				<circle cx="12" cy="12" r="9" fill="none" stroke="#64B5F6" stroke-width="0.5" opacity="0.3" />
				
				<!-- Continents with detailed shapes -->
				<path d="M5 9c1-1 2-1.5 3-1s2 1 2 2v1c0 1-.5 2-1.5 2S6 12 5 10V9z" fill="url(#land-gradient)" stroke="#ffffff" stroke-width="1" class="continent" />
				<path d="M16 7c.5 0 1 .5 1 1v1c0 .5-.5 1.5-1 2s-1.5 1-2 1-1.5-.5-2-1-1-1.5-1-2 .5-1 1-1 1 .5 1.5.5S15 7 16 7z" fill="url(#land-gradient)" stroke="#ffffff" stroke-width="1" class="continent" />
				<path d="M14 15c.5-.5 1-.5 1.5 0s.5 1 0 1.5-1 .5-1.5 0-.5-1 0-1.5z" fill="url(#land-gradient)" stroke="#ffffff" stroke-width="1" class="continent" />
				
				<!-- Connection network -->
				<path d="M7.5 8L12 5l3.5 3" stroke="url(#connection-gradient)" stroke-width="2" class="connection-line network-line-1" />
				<path d="M5.5 13l3 3 5-3" stroke="url(#connection-gradient)" stroke-width="2" class="connection-line network-line-2" />
				
				<!-- Connection points with glowing effect -->
				<circle cx="7.5" cy="8" r="1.2" fill="#FFA726" class="source-node node-1">
					<animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
				</circle>
				<circle cx="12" cy="5" r="1.2" fill="#FFA726" class="source-node node-2">
					<animate attributeName="opacity" values="0.6;1;0.6" dur="2s" begin="0.3s" repeatCount="indefinite" />
				</circle>
				<circle cx="15.5" cy="8" r="1.2" fill="#FFA726" class="source-node node-3">
					<animate attributeName="opacity" values="0.6;1;0.6" dur="2s" begin="0.6s" repeatCount="indefinite" />
				</circle>
				<circle cx="5.5" cy="13" r="1.2" fill="#FFA726" class="source-node node-4">
					<animate attributeName="opacity" values="0.6;1;0.6" dur="2s" begin="0.9s" repeatCount="indefinite" />
				</circle>
				<circle cx="8.5" cy="16" r="1.2" fill="#FFA726" class="source-node node-5">
					<animate attributeName="opacity" values="0.6;1;0.6" dur="2s" begin="1.2s" repeatCount="indefinite" />
				</circle>
				<circle cx="13.5" cy="13" r="1.2" fill="#FFA726" class="source-node node-6">
					<animate attributeName="opacity" values="0.6;1;0.6" dur="2s" begin="1.5s" repeatCount="indefinite" />
				</circle>
			</svg>`,
			desc: "Reduce dependency on expensive imports by connecting with local component makers."
		},
		{
			title: "Creator Community",
			icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-10 h-10 feature-icon">
				<defs>
					<linearGradient id="hub-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="#E91E63" />
						<stop offset="100%" stop-color="#C2185B" />
					</linearGradient>
					<linearGradient id="creator-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#9C27B0" />
						<stop offset="100%" stop-color="#6A1B9A" />
					</linearGradient>
					<linearGradient id="connection-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#FF4081" />
						<stop offset="100%" stop-color="#F50057" />
					</linearGradient>
				</defs>
				
				<!-- Central hub with pulsing effect -->
				<circle cx="12" cy="12" r="3.2" fill="url(#hub-gradient)" stroke="#ffffff" stroke-width="1.8" class="hub">
					<animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
				</circle>
				
				<!-- Creator nodes with gradient fills -->
				<circle cx="5" cy="8" r="2.2" fill="url(#creator-gradient)" stroke="#ffffff" stroke-width="1.5" class="creator creator-1">
					<animate attributeName="r" values="2.2;2.4;2.2" dur="2s" repeatCount="indefinite" />
				</circle>
				<circle cx="19" cy="8" r="2.2" fill="url(#creator-gradient)" stroke="#ffffff" stroke-width="1.5" class="creator creator-2">
					<animate attributeName="r" values="2.2;2.4;2.2" dur="2s" begin="0.3s" repeatCount="indefinite" />
				</circle>
				<circle cx="5" cy="16" r="2.2" fill="url(#creator-gradient)" stroke="#ffffff" stroke-width="1.5" class="creator creator-3">
					<animate attributeName="r" values="2.2;2.4;2.2" dur="2s" begin="0.6s" repeatCount="indefinite" />
				</circle>
				<circle cx="19" cy="16" r="2.2" fill="url(#creator-gradient)" stroke="#ffffff" stroke-width="1.5" class="creator creator-4">
					<animate attributeName="r" values="2.2;2.4;2.2" dur="2s" begin="0.9s" repeatCount="indefinite" />
				</circle>
				<circle cx="12" cy="4" r="2.2" fill="url(#creator-gradient)" stroke="#ffffff" stroke-width="1.5" class="creator creator-5">
					<animate attributeName="r" values="2.2;2.4;2.2" dur="2s" begin="1.2s" repeatCount="indefinite" />
				</circle>
				<circle cx="12" cy="20" r="2.2" fill="url(#creator-gradient)" stroke="#ffffff" stroke-width="1.5" class="creator creator-6">
					<animate attributeName="r" values="2.2;2.4;2.2" dur="2s" begin="1.5s" repeatCount="indefinite" />
				</circle>
				
				<!-- Dynamic connection lines -->
				<path d="M7 8l3 2.5" stroke="url(#connection-gradient-2)" stroke-width="1.5" class="connection network-line-1">
					<animate attributeName="stroke-width" values="1.5;2;1.5" dur="2s" repeatCount="indefinite" />
				</path>
				<path d="M17 8l-3 2.5" stroke="url(#connection-gradient-2)" stroke-width="1.5" class="connection network-line-2">
					<animate attributeName="stroke-width" values="1.5;2;1.5" dur="2s" begin="0.3s" repeatCount="indefinite" />
				</path>
				<path d="M7 16l3-2.5" stroke="url(#connection-gradient-2)" stroke-width="1.5" class="connection network-line-3">
					<animate attributeName="stroke-width" values="1.5;2;1.5" dur="2s" begin="0.6s" repeatCount="indefinite" />
				</path>
				<path d="M17 16l-3-2.5" stroke="url(#connection-gradient-2)" stroke-width="1.5" class="connection network-line-4">
					<animate attributeName="stroke-width" values="1.5;2;1.5" dur="2s" begin="0.9s" repeatCount="indefinite" />
				</path>
				<path d="M12 6v3" stroke="url(#connection-gradient-2)" stroke-width="1.5" class="connection network-line-5">
					<animate attributeName="stroke-width" values="1.5;2;1.5" dur="2s" begin="1.2s" repeatCount="indefinite" />
				</path>
				<path d="M12 18v-3" stroke="url(#connection-gradient-2)" stroke-width="1.5" class="connection network-line-6">
					<animate attributeName="stroke-width" values="1.5;2;1.5" dur="2s" begin="1.5s" repeatCount="indefinite" />
				</path>
				
				<!-- Interconnected mesh -->
				<path d="M5 10v4M19 10v4M7 7l10 1M7 17l10-1M10 5l4 1M10 19l4-1" stroke="#FF80AB" stroke-width="0.7" stroke-dasharray="2 1" class="network-mesh" opacity="0.6" />
			</svg>`,
			desc: "Join a network of indie creators solving common sourcing and scaling challenges together."
		}
	];

	// Particle interface for TypeScript
	interface Particle {
		x: number;
		y: number;
		radius: number;
		color: string;
		velocity: {
			x: number;
			y: number;
		};
		alpha: number;
		decreasing: boolean;
	}

	onMount(() => {
		// Initialize card autoplay if there are multiple banners
		if (data.banners && data.banners.length > 1) {
			resumeAutoplay();
		}
		
		// Initialize smoke animation
		const initSmoke = () => {
			if (!smokeCanvas) return;

			const ctx = smokeCanvas.getContext('2d');
			if (!ctx) return;

			// Set canvas size
			const resizeCanvas = () => {
				smokeCanvas.width = smokeCanvas.offsetWidth;
				smokeCanvas.height = smokeCanvas.offsetHeight;
			};

			resizeCanvas();
			window.addEventListener('resize', resizeCanvas);

			// Smoke particles
			const particles: Particle[] = [];
			const particleCount = 40; // Increased particle count for more visible smoke

			// Create initial particles
			for (let i = 0; i < particleCount; i++) {
				particles.push(createParticle());
			}

			function createParticle(): Particle {
				const radius = Math.random() * 180 + 120; // Larger radius for smoke particles
				return {
					x: Math.random() * smokeCanvas.width,
					y: smokeCanvas.height + radius,
					radius: radius,
					color: `rgba(${194}, ${255}, ${0}, 0.15)`, // Green color (#c2ff00) with base opacity
					velocity: {
						x: (Math.random() - 0.5) * 0.4, // Horizontal movement
						y: -Math.random() * 0.7 - 0.4 // Upward movement
					},
					alpha: 0.07 + Math.random() * 0.08, // Alpha range for visibility
					decreasing: Math.random() > 0.5
				};
			}

			function updateSmoke() {
				if (!ctx) return;
				
				ctx.clearRect(0, 0, smokeCanvas.width, smokeCanvas.height);

				for (let i = 0; i < particles.length; i++) {
					const particle = particles[i];

					// Update position
					particle.x += particle.velocity.x;
					particle.y += particle.velocity.y;

					// Fade in/out effect
					if (particle.decreasing) {
						particle.alpha -= 0.0005;
						if (particle.alpha <= 0.06) {
							particle.decreasing = false;
						}
					} else {
						particle.alpha += 0.0005;
						if (particle.alpha >= 0.15) {
							particle.decreasing = true;
						}
					}

					// Draw the particle
					ctx.beginPath();
					const gradient = ctx.createRadialGradient(
						particle.x, particle.y, 0,
						particle.x, particle.y, particle.radius
					);
					
					// Green smoke gradient (c2ff00)
					gradient.addColorStop(0, `rgba(194, 255, 0, ${particle.alpha})`);
					gradient.addColorStop(1, `rgba(194, 255, 0, 0)`);
					
					ctx.fillStyle = gradient;
					ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
					ctx.fill();

					// Reset particle if it goes off-screen
					if (particle.y < -particle.radius || 
							particle.x < -particle.radius || 
							particle.x > smokeCanvas.width + particle.radius) {
						particles[i] = createParticle();
					}
				}

				requestAnimationFrame(updateSmoke);
			}

			updateSmoke();

			return () => {
				window.removeEventListener('resize', resizeCanvas);
			};
		};

		initSmoke();

		return () => {
			pauseAutoplay(); // Clean up on component unmount
		};
	});

	onDestroy(() => {
		pauseAutoplay();
	});

	// Carousel navigation functions
	function nextBanner() {
		if (data.banners && data.banners.length > 1) {
			indicator_cur = (indicator_cur + 1) % data.banners.length;
		}
	}
	
	function pauseAutoplay() {
		if (autoplayInterval) {
			clearInterval(autoplayInterval);
			autoplayInterval = undefined;
		}
	}
	
	function resumeAutoplay() {
		pauseAutoplay(); // Clear any existing interval first
		if (data.banners && data.banners.length > 1) {
			autoplayInterval = setInterval(nextBanner, cinterval);
		}
	}

</script>

<div class="min-h-screen bg-[#0c0c0c] text-white w-full max-w-full overflow-x-hidden">
	<!-- Welcome Section -->
	<section class="pt-12 pb-16 px-4 relative w-full max-w-full overflow-hidden">
		<!-- Glowing accent -->
		<!-- <div class="absolute top-20 left-1/2 w-96 h-96 bg-[#c2ff00] opacity-10 blur-[120px] -translate-x-1/2 rounded-full"></div> -->
		
		<!-- Heading -->
		<div class="text-center mb-12 relative z-10">
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-4 h-4 rounded-full bg-[#c2ff00] mr-2"></span>
				<span class="text-[#c2ff00] text-sm uppercase tracking-wider font-medium">Welcome to SelfCrafted</span>
			</div>
			<h1 class="text-3xl md:text-4xl font-bold max-w-4xl mx-auto leading-tight">
				Where indie makers connect with
				<span class="block">parts, products, and people.</span>
			</h1>
		</div>
		
		<!-- Features Grid -->
		<div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
			{#each keyFeatures as feature, i}
				<div class="bg-[#151515]/40 rounded-2xl p-6 border border-[#252525] hover:border-[#353535] transition-all hover:shadow-glow group">
					<div class="w-16 h-16 rounded-xl flex items-center justify-center mb-4 border border-[#c2ff00]/30 icon-container transition-all duration-300 group-hover:shadow-glow-sm group-hover:border-[#c2ff00]/50" style="background-color: rgba(194, 255, 0, 0.06);">
						{@html feature.icon}
					</div>
					<h3 class="text-xl font-bold mb-2 text-[#c2ff00] group-hover:translate-y-[-2px] transition-all duration-300">{feature.title}</h3>
					<p class="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{feature.desc}</p>
				</div>
			{/each}
		</div>
	</section>
	
	<!-- Featured Products Section with Banner Carousel -->
	<section class="py-20 px-4 relative overflow-hidden w-full max-w-full">
		<!-- Background Elements -->
		<div class="absolute inset-0 bg-[#0a0a0a] z-0"></div>
		
		<!-- Animated Green Smoke Plumes -->
		<div class="smoke-container absolute inset-0 z-0 opacity-40 overflow-hidden">
			<canvas bind:this={smokeCanvas} class="w-full h-full"></canvas>
		</div>
		
		<div class="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#c2ff00] opacity-5 blur-[150px] rounded-full"></div>
		<div class="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500 opacity-5 blur-[150px] rounded-full"></div>
		
		<!-- Section heading -->
		<div class="relative z-10 max-w-7xl mx-auto mb-10">
			<div class="flex flex-col md:flex-row md:items-center md:justify-between">
				<div>
					<div class="inline-flex items-center mb-3">
						<span class="w-4 h-4 rounded-full bg-[#c2ff00] mr-2"></span>
						<span class="text-[#c2ff00] text-sm uppercase tracking-wider font-medium">Featured Creations</span>
					</div>
					<h2 class="text-2xl md:text-3xl font-bold">Discover Exceptional Crafts</h2>
				</div>
				<div class="mt-4 md:mt-0">
					<a href="/featured" class="inline-flex items-center text-[#c2ff00] hover:text-white transition-colors group">
						<span>View all featured</span>
						<Icon icon="ph:arrow-right-bold" class="ml-2 text-xl transition-transform group-hover:translate-x-1" />
					</a>
				</div>
			</div>
		</div>
		
		{#if data.banners?.length}
			<div class="max-w-7xl mx-auto relative z-10">
				<!-- Banner Carousel with 3D effects -->
				<div class="perspective-container">
					<div class="card-stack-container">
						{#if data.banners && data.banners.length > 0}
							<!-- Current card (active) -->
							{#key indicator_cur}
							<a href={data.banners[indicator_cur].url || `/product/craft/item=${indicator_cur}`} 
							   class="card active-card block w-full h-full cursor-pointer" 
							   transition:fly={{ y: -120, duration: 800, opacity: 0, easing: cubicOut }}>
								<div 
									style="background-image: url({data.banners[indicator_cur].img});"
									class="absolute inset-0 bg-cover bg-center"
									on:mouseenter={pauseAutoplay}
									on:mouseleave={resumeAutoplay}>
									<div class="card-content">
										<div class="flex flex-col items-start mb-4">
											<div class="px-3 py-1 bg-[#c2ff00] text-black text-xs font-bold uppercase rounded-full mb-4 shadow-elevation-1 transform-gpu hover:shadow-elevation-2 hover:translate-z-[5px] transition-all">
												Featured
											</div>
											<h3 class="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-[#c2ff00] transition-colors transform-gpu group-hover:translate-z-[10px]">
												{data.banners[indicator_cur].name}
											</h3>
											<div class="flex items-center mt-2 transform-gpu group-hover:translate-z-[8px]">
												<div class="w-8 h-8 rounded-full bg-[#252525] flex items-center justify-center mr-3 shadow-elevation-1">
													<Icon icon="ph:user-bold" class="text-[#c2ff00]" />
												</div>
												<span class="text-gray-300">By <span class="text-white font-medium">{data.banners[indicator_cur].author}</span></span>
											</div>
										</div>
									</div>
								</div>
							</a>
							{/key}

							<!-- Previous Cards (visible in the stack) -->
							{#if data.banners.length > 1}
								{#key indicator_cur}
								<div class="card back-card back-card-1 pointer-events-none" 
									transition:fly={{ y: -80, duration: 800, opacity: 0, easing: cubicOut }}
									style="background-image: url({data.banners[(indicator_cur - 1 + data.banners.length) % data.banners.length]?.img})">
									<div class="absolute inset-0 bg-black/40"></div>
								</div>
								{/key}
							{/if}
							
							{#if data.banners.length > 2}
								{#key indicator_cur}
								<div class="card back-card back-card-2 pointer-events-none" 
									transition:fly={{ y: -120, duration: 800, opacity: 0, easing: cubicOut }}
									style="background-image: url({data.banners[(indicator_cur - 2 + data.banners.length) % data.banners.length]?.img})">
									<div class="absolute inset-0 bg-black/60"></div>
								</div>
								{/key}
							{/if}
						{/if}
					</div>
					
					<!-- Navigation Controls with 3D pop effect -->
					<div class="absolute top-1/2 left-4 -translate-y-1/2 z-30">
						<button 
							on:click={() => {
								pauseAutoplay();
								if (data.banners && data.banners.length > 0) {
									indicator_cur = (indicator_cur - 1 + data.banners.length) % data.banners.length;
								}
								setTimeout(resumeAutoplay, 10000);
							}}
							class="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-[#c2ff00] hover:text-black transition-colors shadow-elevation-1 hover:shadow-elevation-2 transform-gpu hover:scale-110">
							<Icon icon="ph:caret-left-bold" />
						</button>
					</div>
					<div class="absolute top-1/2 right-4 -translate-y-1/2 z-30">
						<button 
							on:click={() => {
								pauseAutoplay();
								if (data.banners && data.banners.length > 0) {
									indicator_cur = (indicator_cur + 1) % data.banners.length;
								}
								setTimeout(resumeAutoplay, 10000);
							}}
							class="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-[#c2ff00] hover:text-black transition-colors shadow-elevation-1 hover:shadow-elevation-2 transform-gpu hover:scale-110">
							<Icon icon="ph:caret-right-bold" />
						</button>
					</div>
					
					<!-- 3D glowing effect -->
					<div class="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[70%] h-20 bg-[#c2ff00] opacity-[0.07] blur-[50px] rounded-full transform-gpu"></div>
				</div>
				
				<!-- Custom Indicator -->
				<div class="flex items-center justify-center mt-8 space-x-3">
					{#each Array(data.banners?.length || 0) as _, i}
						<button 
							on:click={() => {
								if (indicator_cur !== i) {
									pauseAutoplay();
									indicator_cur = i;
									setTimeout(resumeAutoplay, 10000);
								}
							}}
							class="transform-gpu hover:translate-z-[5px] transition-all {indicator_cur === i ? 'h-2 w-8 bg-[#c2ff00] shadow-glow-sm' : 'h-2 w-2 bg-gray-600 hover:bg-gray-400'} rounded-full">
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="max-w-7xl mx-auto py-20 text-center">
				<div class="text-gray-400">No featured products available at this time.</div>
			</div>
		{/if}
	</section>
	
	<!-- Product List Section -->
	<section class="px-4 pb-20 relative w-full max-w-full overflow-hidden">
		<div class="max-w-7xl mx-auto">
			<!-- Section heading & Filters -->
			<div class="flex flex-col md:flex-row md:items-center md:justify-between mb-10 mt-10">
				<div>
					<div class="inline-flex items-center mb-3">
						<span class="w-4 h-4 rounded-full bg-[#c2ff00] mr-2"></span>
						<span class="text-[#c2ff00] text-sm uppercase tracking-wider font-medium">Browse Creations</span>
					</div>
					<h2 class="text-2xl md:text-3xl font-bold mb-4 md:mb-0">Find Your Perfect Match</h2>
				</div>
				
				<div class="flex flex-wrap gap-3 items-center">
					<button 
						on:click={()=>{goto('?filter=All');setup("All")}} 
						class="px-4 py-2 rounded-full transition-all {$page.url.searchParams.get('filter') == 'All' ? 'bg-[#c2ff00] text-black font-medium' : 'bg-[#151515] hover:bg-[#252525] text-white'}">
						All
					</button>
					<button 
						on:click={()=>{goto('?filter=Products');setup("Products")}} 
						class="px-4 py-2 rounded-full transition-all {$page.url.searchParams.get('filter') != null ? $page.url.searchParams.get('filter') == 'Products' ? 'bg-[#c2ff00] text-black font-medium' : 'bg-[#151515] hover:bg-[#252525] text-white' : 'bg-[#c2ff00] text-black font-medium'}">
						Products
					</button>
					<button 
						on:click={()=>{goto('?filter=Spares',);setup("Spares")}} 
						class="px-4 py-2 rounded-full transition-all {$page.url.searchParams.get('filter') == 'Spares' ? 'bg-[#c2ff00] text-black font-medium' : 'bg-[#151515] hover:bg-[#252525] text-white'}">
						Spares
					</button>
					<button 
						on:click={()=>{goto('?filter=FleaMarket',);setup("FleaMarket")}} 
						class="px-4 py-2 rounded-full transition-all {$page.url.searchParams.get('filter') == 'FleaMarket' ? 'bg-[#c2ff00] text-black font-medium' : 'bg-[#151515] hover:bg-[#252525] text-white'}">
						Flea Market
					</button>
				</div>
			</div>
			
			<!-- Products -->
			{#if loading}
				<div class="flex flex-col py-32 justify-center items-center w-full bg-[#0f0f0f] rounded-3xl border border-[#252525]">
					<Loader />
					<div class="text-gray-400 text-center text-xl mt-6">Loading products...</div>
				</div>
			{:else}
				{#if products && products.length > 0}
					<div class="relative">
						<!-- Subtle glow effect -->
						<div class="absolute -top-20 left-1/3 w-64 h-64 bg-[#c2ff00] opacity-5 blur-[100px] rounded-full"></div>
						
						{#key products}
							<ProductList {products} {getLink} accent1="#0c0c0c" accent2="#151515" accent3="#c2ff00" />
						{/key}
					</div>
				{:else}
					<div class="flex flex-col py-32 justify-center items-center w-full bg-[#0f0f0f] rounded-3xl border border-[#252525] overflow-hidden relative">
						<!-- Empty state background effect -->
						<div class="absolute inset-0 bg-[url('/images/noise.png')] opacity-5"></div>
						
						<div class="w-20 h-20 rounded-full bg-[#151515] flex items-center justify-center mb-6">
							<Icon icon="ph:magnifying-glass" class="text-[#c2ff00] text-3xl" />
						</div>
						<div class="text-[#c2ff00] text-center text-xl font-medium mb-2">No products found</div>
						<div class="text-gray-400 text-center max-w-md">
							We couldn't find any products matching your current filters. Try adjusting your selection or check back later for new additions.
						</div>
						
						<button 
							on:click={()=>{goto('?filter=All');setup("All")}}
							class="mt-8 px-6 py-3 bg-[#151515] hover:bg-[#252525] rounded-lg text-white transition-all">
							View All Products
						</button>
					</div>
				{/if}
			{/if}
		</div>
	</section>
</div>

<style lang="postcss">
	/* 3D Transform Styles */
	.perspective-container {
		perspective: 1000px;
		transform-style: preserve-3d;
	}
	
	.transform-gpu {
		transform: translateZ(0);
		backface-visibility: hidden;
		-webkit-font-smoothing: subpixel-antialiased;
	}
	
	.translate-z-\[-50px\] {
		transform: translateZ(-50px);
	}
	
	.translate-z-\[-25px\] {
		transform: translateZ(-25px);
	}
	
	.hover\:translate-z-\[5px\]:hover {
		transform: translateZ(5px);
	}
	
	.hover\:translate-z-\[10px\]:hover {
		transform: translateZ(10px);
	}
	
	.hover\:translate-z-\[15px\]:hover {
		transform: translateZ(15px);
	}
	
	.hover\:translate-z-\[20px\]:hover {
		transform: translateZ(20px);
	}
	
	.hover\:translate-z-\[25px\]:hover {
		transform: translateZ(25px);
	}
	
	.group-hover\:translate-z-\[5px\] {
		transform: translateZ(0);
	}
	
	.group:hover .group-hover\:translate-z-\[5px\] {
		transform: translateZ(5px);
	}
	
	.group:hover .group-hover\:translate-z-\[8px\] {
		transform: translateZ(8px);
	}
	
	.group:hover .group-hover\:translate-z-\[10px\] {
		transform: translateZ(10px);
	}
	
	.group:hover .group-hover\:translate-z-\[15px\] {
		transform: translateZ(15px);
	}
	
	.group:hover .group-hover\:translate-z-\[20px\] {
		transform: translateZ(20px);
	}
	
	.group:hover .group-hover\:translate-y-\[-5px\] {
		transform: translateY(-5px);
	}
	
	/* Shadow Elevation Styles */
	.shadow-elevation-1 {
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
	}
	
	.shadow-elevation-2 {
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}
	
	.shadow-elevation-3 {
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
	}
	
	.hover\:shadow-elevation-2:hover {
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}
	
	.hover\:shadow-elevation-3:hover {
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
	}
	
	.shadow-glow-sm {
		box-shadow: 0 0 15px rgba(194, 255, 0, 0.2);
	}
	
	/* Card Stack Container Styles */
	.card-stack-container {
		position: relative;
		width: 100%;
		height: 460px;
		transform-style: preserve-3d;
		perspective: 1500px;
		border-radius: 1rem;
		margin: 0 auto;
		overflow: visible;
	}
	
	/* Base Card Styles */
	.card {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		border-radius: 1rem;
		background-position: center;
		background-size: cover;
		background-repeat: no-repeat;
		transform-style: preserve-3d;
		will-change: transform, opacity;
		overflow: hidden;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
		transform-origin: center center;
	}
	
	.card-content {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 20;
		padding: 2rem;
		background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
	}
	
	/* Active Card */
	.active-card {
		z-index: 30;
		transform: translateY(0) scale(1);
		filter: brightness(1);
	}
	
	.active-card:before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
		z-index: 5;
		transition: opacity 0.6s ease;
	}
	
	/* Back Cards */
	.back-card {
		pointer-events: none;
		will-change: transform, opacity, filter;
		transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	
	.back-card-1 {
		z-index: 20;
		transform: translateY(-40px) scale(0.95);
		filter: brightness(0.85);
	}
	
	.back-card-2 {
		z-index: 10;
		transform: translateY(-80px) scale(0.9);
		filter: brightness(0.7);
	}

	/* Card Animation */
	@keyframes card-entrance {
		0% {
			opacity: 0;
			transform: translateY(-120px) scale(0.85);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	
	.card-active {
		animation: card-entrance 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
	}
	
	/* Exit animation applied when changing cards */
	@keyframes card-exit {
		0% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
		100% {
			opacity: 0;
			transform: translateY(120px) scale(0.85);
		}
	}
	
	.card-exit {
		animation: card-exit 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
	}

	/* Back card animations */
	@keyframes back-card-advance {
		0% {
			transform: translateY(-80px) scale(0.9);
			filter: brightness(0.7);
		}
		100% {
			transform: translateY(-40px) scale(0.95);
			filter: brightness(0.85);
		}
	}

	@keyframes back-card-exit {
		0% {
			transform: translateY(-40px) scale(0.95);
			filter: brightness(0.85);
		}
		100% {
			transform: translateY(120px) scale(0.85);
			filter: brightness(0.6);
			opacity: 0;
		}
	}

	.back-card.animating-advance {
		animation: back-card-advance 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
	}

	.back-card.animating-exit {
		animation: back-card-exit 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
	}
	
	/* Realistic Smoke Effect */
	.smoke-container {
		mix-blend-mode: screen;
		pointer-events: none;
		z-index: 0;
	}
	
	.smoke-plume {
		position: absolute;
		filter: blur(40px);
		background-repeat: no-repeat;
		background-size: contain;
		transform: translateZ(0);
		will-change: transform, opacity;
		opacity: 0;
		mix-blend-mode: screen;
	}
	
	.plume-1 {
		width: 260px;
		height: 450px;
		left: 10%;
		bottom: -10%;
		background-image: radial-gradient(circle at center, rgba(194, 255, 0, 0.6) 0%, rgba(100, 140, 0, 0) 70%);
		animation: smoke-drift-1 28s ease-out infinite;
	}
	
	.plume-2 {
		width: 320px;
		height: 500px;
		left: 25%;
		bottom: -15%;
		background-image: radial-gradient(ellipse at center, rgba(194, 255, 0, 0.5) 0%, rgba(100, 140, 0, 0) 75%);
		animation: smoke-drift-2 35s ease-out 7s infinite;
	}
	
	.plume-3 {
		width: 280px;
		height: 480px;
		left: 40%;
		bottom: -8%;
		background-image: radial-gradient(ellipse at center, rgba(194, 255, 0, 0.45) 0%, rgba(100, 140, 0, 0) 70%);
		animation: smoke-drift-3 40s ease-out 3s infinite;
	}
	
	.plume-4 {
		width: 340px;
		height: 550px;
		right: 40%;
		bottom: -12%;
		background-image: radial-gradient(circle at center, rgba(194, 255, 0, 0.5) 0%, rgba(100, 140, 0, 0) 65%);
		animation: smoke-drift-4 37s ease-out 12s infinite;
	}
	
	.plume-5 {
		width: 300px;
		height: 520px;
		right: 25%;
		bottom: -10%;
		background-image: radial-gradient(ellipse at center, rgba(194, 255, 0, 0.55) 0%, rgba(100, 140, 0, 0) 70%);
		animation: smoke-drift-5 32s ease-out 9s infinite;
	}
	
	.plume-6 {
		width: 280px;
		height: 480px;
		right: 10%;
		bottom: -5%;
		background-image: radial-gradient(circle at center, rgba(194, 255, 0, 0.5) 0%, rgba(100, 140, 0, 0) 65%);
		animation: smoke-drift-6 38s ease-out 5s infinite;
	}
	
	.plume-7 {
		width: 350px;
		height: 550px;
		left: 5%;
		bottom: -15%;
		background-image: radial-gradient(ellipse at center, rgba(194, 255, 0, 0.55) 0%, rgba(100, 140, 0, 0) 70%);
		animation: smoke-drift-7 42s ease-out 15s infinite;
	}
	
	/* Small ambient plumes */
	.plume-small {
		filter: blur(30px);
		mix-blend-mode: screen;
	}
	
	.plume-s1 {
		width: 120px;
		height: 200px;
		left: 15%;
		bottom: 30%;
		background-image: radial-gradient(circle at center, rgba(194, 255, 0, 0.45) 0%, rgba(100, 140, 0, 0) 70%);
		animation: smoke-drift-small-1 20s ease-out 2s infinite;
	}
	
	.plume-s2 {
		width: 150px;
		height: 250px;
		left: 35%;
		bottom: 40%;
		background-image: radial-gradient(circle at center, rgba(194, 255, 0, 0.4) 0%, rgba(100, 140, 0, 0) 70%);
		animation: smoke-drift-small-2 25s ease-out 8s infinite;
	}
	
	.plume-s3 {
		width: 140px;
		height: 230px;
		left: 55%;
		bottom: 20%;
		background-image: radial-gradient(circle at center, rgba(194, 255, 0, 0.4) 0%, rgba(100, 140, 0, 0) 70%);
		animation: smoke-drift-small-3 22s ease-out 5s infinite;
	}
	
	.plume-s4 {
		width: 160px;
		height: 260px;
		right: 25%;
		bottom: 35%;
		background-image: radial-gradient(circle at center, rgba(194, 255, 0, 0.35) 0%, rgba(100, 140, 0, 0) 70%);
		animation: smoke-drift-small-4 27s ease-out 10s infinite;
	}
	
	.plume-s5 {
		width: 130px;
		height: 210px;
		right: 15%;
		bottom: 25%;
		background-image: radial-gradient(circle at center, rgba(194, 255, 0, 0.4) 0%, rgba(100, 140, 0, 0) 70%);
		animation: smoke-drift-small-5 23s ease-out 7s infinite;
	}
	
	.plume-s6 {
		width: 180px;
		height: 300px;
		left: 45%;
		bottom: 15%;
		background-image: radial-gradient(circle at center, rgba(194, 255, 0, 0.45) 0%, rgba(100, 140, 0, 0) 70%);
		animation: smoke-drift-small-6 30s ease-out 3s infinite;
	}
	
	.plume-s7 {
		width: 170px;
		height: 270px;
		right: 40%;
		bottom: 10%;
		background-image: radial-gradient(circle at center, rgba(194, 255, 0, 0.4) 0%, rgba(100, 140, 0, 0) 70%);
		animation: smoke-drift-small-7 28s ease-out 11s infinite;
	}
	
	.plume-s8 {
		width: 140px;
		height: 230px;
		left: 25%;
		bottom: 5%;
		background-image: radial-gradient(circle at center, rgba(194, 255, 0, 0.35) 0%, rgba(100, 140, 0, 0) 70%);
		animation: smoke-drift-small-8 24s ease-out 9s infinite;
	}
	
	.plume-s9 {
		width: 190px;
		height: 310px;
		right: 20%;
		bottom: 5%;
		background-image: radial-gradient(circle at center, rgba(194, 255, 0, 0.4) 0%, rgba(100, 140, 0, 0) 70%);
		animation: smoke-drift-small-9 26s ease-out 6s infinite;
	}
	
	/* Main plume animations */
	@keyframes smoke-drift-1 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.8);
		}
		5% {
			opacity: 0.5;
		}
		30% {
			opacity: 0.4;
			transform: translate(-20px, -150px) scale(1.1);
		}
		70% {
			opacity: 0.2;
			transform: translate(-30px, -350px) scale(1.3);
		}
		100% {
			opacity: 0;
			transform: translate(-40px, -450px) scale(1.4);
		}
	}
	
	@keyframes smoke-drift-2 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.9);
		}
		5% {
			opacity: 0.45;
		}
		35% {
			opacity: 0.35;
			transform: translate(20px, -180px) scale(1.15);
		}
		75% {
			opacity: 0.2;
			transform: translate(35px, -380px) scale(1.3);
		}
		100% {
			opacity: 0;
			transform: translate(45px, -480px) scale(1.4);
		}
	}
	
	@keyframes smoke-drift-3 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.7);
		}
		5% {
			opacity: 0.5;
		}
		30% {
			opacity: 0.4;
			transform: translate(-10px, -160px) scale(1.05);
		}
		70% {
			opacity: 0.25;
			transform: translate(-15px, -370px) scale(1.2);
		}
		100% {
			opacity: 0;
			transform: translate(-20px, -470px) scale(1.3);
		}
	}
	
	@keyframes smoke-drift-4 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.85);
		}
		5% {
			opacity: 0.5;
		}
		35% {
			opacity: 0.4;
			transform: translate(15px, -190px) scale(1.1);
		}
		75% {
			opacity: 0.25;
			transform: translate(25px, -390px) scale(1.25);
		}
		100% {
			opacity: 0;
			transform: translate(30px, -490px) scale(1.35);
		}
	}
	
	@keyframes smoke-drift-5 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.8);
		}
		5% {
			opacity: 0.45;
		}
		35% {
			opacity: 0.35;
			transform: translate(-15px, -170px) scale(1.1);
		}
		75% {
			opacity: 0.2;
			transform: translate(-25px, -360px) scale(1.25);
		}
		100% {
			opacity: 0;
			transform: translate(-35px, -460px) scale(1.35);
		}
	}
	
	@keyframes smoke-drift-6 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.75);
		}
		5% {
			opacity: 0.5;
		}
		35% {
			opacity: 0.4;
			transform: translate(10px, -180px) scale(1.1);
		}
		75% {
			opacity: 0.2;
			transform: translate(20px, -380px) scale(1.2);
		}
		100% {
			opacity: 0;
			transform: translate(25px, -480px) scale(1.3);
		}
	}
	
	@keyframes smoke-drift-7 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.7);
		}
		5% {
			opacity: 0.45;
		}
		35% {
			opacity: 0.35;
			transform: translate(-10px, -160px) scale(1.05);
		}
		75% {
			opacity: 0.2;
			transform: translate(-20px, -350px) scale(1.2);
		}
		100% {
			opacity: 0;
			transform: translate(-25px, -450px) scale(1.3);
		}
	}
	
	/* Small plume animations */
	@keyframes smoke-drift-small-1 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.9);
		}
		10% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.2;
			transform: translate(-10px, -100px) scale(1.1);
		}
		100% {
			opacity: 0;
			transform: translate(-15px, -200px) scale(1.2);
		}
	}
	
	@keyframes smoke-drift-small-2 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.85);
		}
		10% {
			opacity: 0.25;
		}
		50% {
			opacity: 0.15;
			transform: translate(15px, -120px) scale(1.15);
		}
		100% {
			opacity: 0;
			transform: translate(20px, -220px) scale(1.25);
		}
	}
	
	@keyframes smoke-drift-small-3 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.9);
		}
		10% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.2;
			transform: translate(-5px, -110px) scale(1.1);
		}
		100% {
			opacity: 0;
			transform: translate(-10px, -210px) scale(1.2);
		}
	}
	
	@keyframes smoke-drift-small-4 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.8);
		}
		10% {
			opacity: 0.25;
		}
		50% {
			opacity: 0.15;
			transform: translate(10px, -130px) scale(1.1);
		}
		100% {
			opacity: 0;
			transform: translate(15px, -230px) scale(1.2);
		}
	}
	
	@keyframes smoke-drift-small-5 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.85);
		}
		10% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.2;
			transform: translate(-8px, -100px) scale(1.05);
		}
		100% {
			opacity: 0;
			transform: translate(-12px, -200px) scale(1.15);
		}
	}
	
	@keyframes smoke-drift-small-6 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.9);
		}
		10% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.2;
			transform: translate(5px, -150px) scale(1.1);
		}
		100% {
			opacity: 0;
			transform: translate(10px, -250px) scale(1.2);
		}
	}
	
	@keyframes smoke-drift-small-7 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.85);
		}
		10% {
			opacity: 0.25;
		}
		50% {
			opacity: 0.15;
			transform: translate(-12px, -120px) scale(1.1);
		}
		100% {
			opacity: 0;
			transform: translate(-18px, -220px) scale(1.2);
		}
	}
	
	@keyframes smoke-drift-small-8 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.9);
		}
		10% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.2;
			transform: translate(8px, -110px) scale(1.05);
		}
		100% {
			opacity: 0;
			transform: translate(12px, -210px) scale(1.15);
		}
	}
	
	@keyframes smoke-drift-small-9 {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.85);
		}
		10% {
			opacity: 0.25;
		}
		50% {
			opacity: 0.15;
			transform: translate(-7px, -140px) scale(1.1);
		}
		100% {
			opacity: 0;
			transform: translate(-12px, -240px) scale(1.2);
		}
	}
	
	/* Enhanced Feature Icon Animations */
	
	/* Feature Icon Base */
	.feature-icon {
		transform: translateZ(0);
		transition: all 0.3s ease;
	}
	
	.w-16:hover .feature-icon {
		transform: scale(1.1);
	}
	
	/* Marketplace Icon Animation */
	.storefront-base {
		opacity: 0.9;
	}
	
	.storefront-roof {
		animation: shimmer 3s infinite alternate;
		opacity: 0.85;
	}
	
	.storefront-door {
		animation: pulse 2s infinite alternate;
		opacity: 0.9;
	}
	
	.product-item {
		animation: blink 4s infinite;
		opacity: 0.8;
	}
	
	.item-1 { animation-delay: 0s; }
	.item-2 { animation-delay: 0.5s; }
	.item-3 { animation-delay: 1s; }
	.item-4 { animation-delay: 1.5s; }
	
	.circuit-trace {
		stroke-dasharray: 8;
		stroke-dashoffset: 16;
		animation: dash 5s linear infinite;
		opacity: 0.7;
	}
	
	.circuit-node {
		animation: pulse 3s infinite alternate;
		opacity: 0.8;
	}
	
	/* Local Sourcing Icon Animation */
	.world-map {
		animation: pulse 8s infinite alternate;
		opacity: 0.8;
	}
	
	.continent {
		animation: pulse 5s infinite alternate;
		opacity: 0.7;
	}
	
	.connection-line {
		stroke-dasharray: 10;
		stroke-dashoffset: 20;
		animation: dash 6s linear infinite;
		opacity: 0.7;
	}
	
	.source-node {
		animation: glow 3s infinite alternate;
	}
	
	.node-1 { animation-delay: 0s; }
	.node-2 { animation-delay: 0.2s; }
	.node-3 { animation-delay: 0.4s; }
	.node-4 { animation-delay: 0.6s; }
	.node-5 { animation-delay: 0.8s; }
	.node-6 { animation-delay: 1s; }
	
	/* Community Icon Animation */
	.hub {
		animation: pulse 3s infinite alternate;
		opacity: 0.9;
	}
	
	.creator {
		animation: glow 4s infinite alternate;
	}
	
	.creator-1 { animation-delay: 0s; }
	.creator-2 { animation-delay: 0.5s; }
	.creator-3 { animation-delay: 1s; }
	.creator-4 { animation-delay: 1.5s; }
	.creator-5 { animation-delay: 2s; }
	.creator-6 { animation-delay: 2.5s; }
	
	.connection {
		stroke-dasharray: 10;
		stroke-dashoffset: 10;
		animation: dash 5s linear infinite;
		opacity: 0.8;
	}
	
	.network-line-1 { animation-delay: 0s; }
	.network-line-2 { animation-delay: 0.5s; }
	.network-line-3 { animation-delay: 1s; }
	.network-line-4 { animation-delay: 1.5s; }
	.network-line-5 { animation-delay: 2s; }
	.network-line-6 { animation-delay: 2.5s; }
	
	.network-mesh {
		animation: pulse 4s infinite alternate;
		opacity: 0.5;
	}
	
	.mesh-1 { animation-delay: 0.1s; }
	.mesh-2 { animation-delay: 0.6s; }
	.mesh-3 { animation-delay: 1.1s; }
	.mesh-4 { animation-delay: 1.6s; }
	.mesh-5 { animation-delay: 2.1s; }
	.mesh-6 { animation-delay: 2.6s; }
	
	@keyframes shimmer {
		0% { opacity: 0.7; }
		100% { opacity: 1; stroke-width: 1.8; }
	}
	
	@keyframes blink {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 0.9; }
	}
	
	@keyframes dash {
		to { stroke-dashoffset: 0; }
	}
	
	@keyframes glow {
		0% { opacity: 0.6; stroke-width: 1.3; }
		100% { opacity: 1; stroke-width: 1.8; }
	}
	
	/* Feature Icon Container Styles */
	.icon-container {
		position: relative;
		overflow: hidden;
		transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
		transform: translateZ(0);
	}
	
	.icon-container:before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: radial-gradient(circle at center, rgba(194, 255, 0, 0.15), transparent 70%);
		opacity: 0;
		transition: opacity 0.5s ease;
	}
	
	.group:hover .icon-container {
		transform: scale(1.05) translateZ(5px);
	}
	
	.group:hover .icon-container:before {
		opacity: 1;
	}
	
	.shadow-glow {
		box-shadow: 0 5px 20px -5px rgba(194, 255, 0, 0.1);
	}

	/* Animation Keyframes */
	@keyframes pulse {
		0% { opacity: 0.6; }
		100% { opacity: 1; }
	}
	
	@keyframes rotate {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>

