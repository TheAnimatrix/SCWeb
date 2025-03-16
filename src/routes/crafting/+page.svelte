<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let currentStep = 0;
	let canvas: HTMLCanvasElement;
	
	const craftingSteps = [
		{
			title: "Prototype",
			icon: "ph:code-bold",
			description: "Build your creation and document it",
			details: "Open-source your project with the right license"
		},
		{
			title: "Connect",
			icon: "ph:discord-logo-bold",
			description: "Share your project with us",
			details: "Join our Discord community or reach out via email"
		},
		{
			title: "Launch",
			icon: "ph:rocket-launch-bold",
			description: "Get listed on SelfCrafted",
			details: "We handle quality checks and order fulfillment"
		},
		{
			title: "Scale",
			icon: "ph:chart-line-up-bold",
			description: "Grow with support",
			details: "Access manufacturing, compliance, and marketing help"
		}
	];

	const scaleupServices = [
		{ icon: "ph:circuitry-bold", label: "Manufacturing Contacts" },
		{ icon: "ph:cube-bold", label: "Enclosure Production" },
		{ icon: "ph:shield-check-bold", label: "Safety Compliance " },
		{ icon: "ph:shopping-cart-bold", label: "Component Sourcing" },
		{ icon: "ph:code-bold", label: "Software Support" },
		{ icon: "ph:wrench-bold", label: "Debug Tooling" },
		{ icon: "ph:users-bold", label: "Customer Research" },
		{ icon: "ph:megaphone-bold", label: "Marketing" }
	];

	onMount(() => {
		if (!canvas) return;
		
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;

		const particles: Array<{
			x: number;
			y: number;
			size: number;
			speedX: number;
			speedY: number;
			opacity: number;
		}> = [];

		for (let i = 0; i < 50; i++) {
			particles.push({
				x: Math.random() * canvas.width,
				y: Math.random() * canvas.height,
				size: Math.random() * 2 + 1,
				speedX: (Math.random() - 0.5) * 0.5,
				speedY: (Math.random() - 0.5) * 0.5,
				opacity: Math.random() * 0.5 + 0.2
			});
		}

		function animate() {
			if (!ctx) return;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			
			particles.forEach(particle => {
				if (!ctx) return;
				particle.x += particle.speedX;
				particle.y += particle.speedY;

				if (particle.x < 0) particle.x = canvas.width;
				if (particle.x > canvas.width) particle.x = 0;
				if (particle.y < 0) particle.y = canvas.height;
				if (particle.y > canvas.height) particle.y = 0;

				ctx.beginPath();
				ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(194, 255, 0, ${particle.opacity})`;
				ctx.fill();
			});

			requestAnimationFrame(animate);
		}

		animate();
	});
</script>

<div class="min-h-screen bg-[#0c0c0c] text-white relative overflow-hidden">
	<!-- Animated Background -->
	<canvas
		bind:this={canvas}
		class="absolute inset-0 w-full h-full opacity-30"
	/>
	
	<!-- Hero Section -->
	<section class="relative pt-20 pb-16 px-4">
		<div class="max-w-4xl mx-auto text-center relative z-10">
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-4 h-4 rounded-full bg-[#c2ff00] mr-2"></span>
				<span class="text-[#c2ff00] text-sm uppercase tracking-wider font-medium">Start Crafting</span>
			</div>
			<h1 class="text-4xl md:text-5xl font-bold mb-6">
				Turn Your Creation Into
				<span class="text-[#c2ff00]">Reality</span>
			</h1>
			<p class="text-gray-400 text-lg max-w-2xl mx-auto">
				Join a community of makers transforming hobbies into successful products.
				We provide the platform, tools, and support—you bring the innovation.
			</p>
		</div>
	</section>

	<!-- Process Steps -->
	<section class="py-16 px-4 relative">
		<div class="max-w-6xl mx-auto">
			<!-- Connection Beams -->
			<div class="absolute top-0 left-0 w-full h-full pointer-events-none hidden md:block">
				<svg class="w-full h-full absolute top-0 left-0" style="filter: blur(1px);">
					<defs>
						<linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
							<stop offset="0%" style="stop-color: rgb(194, 255, 0); stop-opacity: 0" />
							<stop offset="50%" style="stop-color: rgb(194, 255, 0); stop-opacity: 0.3" />
							<stop offset="100%" style="stop-color: rgb(194, 255, 0); stop-opacity: 0" />
						</linearGradient>
					</defs>
					<path 
						class="beam-path"
						d="M 25% 50% L 75% 50%"
						stroke="url(#beamGradient)"
						stroke-width="2"
						fill="none"
					/>
				</svg>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
				{#each craftingSteps as step, i}
					<div
						class="bg-[#151515] rounded-2xl p-6 border border-[#252525] hover:border-[#353535] transition-all hover:shadow-glow group relative overflow-hidden {currentStep === i ? 'active' : ''}"
						on:mouseenter={() => currentStep = i}
					>
						<!-- Glow Effect -->
						<div class="absolute inset-0 bg-[#c2ff00] opacity-0 group-hover:opacity-5 transition-opacity duration-300 blur-2xl"></div>
						
						<div class="relative z-10">
							<div class="w-14 h-14 rounded-xl flex items-center justify-center mb-4 border border-[#c2ff00]/30 group-hover:border-[#c2ff00]/50 transition-all duration-300" style="background-color: rgba(194, 255, 0, 0.06);">
								<Icon icon={step.icon} class="text-3xl text-[#c2ff00]" />
							</div>
							<h3 class="text-xl font-bold mb-2 text-[#c2ff00] group-hover:translate-y-[-2px] transition-all duration-300">
								{step.title}
							</h3>
							<p class="text-gray-400 group-hover:text-gray-300 transition-colors duration-300 mb-2">
								{step.description}
							</p>
							<p class="text-sm text-gray-500 group-hover:text-gray-400 transition-colors duration-300">
								{step.details}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Scale-up Services -->
	<section class="py-16 px-4 relative bg-[#0a0a0a]">
		<div class="max-w-6xl mx-auto">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold mb-4">Scale With Support</h2>
				<p class="text-gray-400">
					5% platform fee* gets you access to comprehensive scaling services
				</p>
			</div>
			
			<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
				{#each scaleupServices as service}
					<div class="group p-4 text-center">
						<div class="w-16 h-16 rounded-full bg-[#151515] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
							<Icon icon={service.icon} class="text-3xl text-[#c2ff00]" />
						</div>
						<p class="text-sm text-gray-400 group-hover:text-white transition-colors duration-300">
							{service.label}
						</p>
					</div>
				{/each}
			</div>
			
			<p class="text-center text-sm text-gray-500 mt-8">
				*Scale-up assistance fees vary by product complexity
			</p>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="py-16 px-4 relative">
		<div class="max-w-4xl mx-auto text-center">
			<a
				href="https://discord.gg/UQ74TQfMqM"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center justify-center px-8 py-4 bg-[#151515] hover:bg-[#252525] rounded-xl border border-[#353535] hover:border-[#c2ff00] transition-all group"
			>
				<Icon icon="ph:discord-logo-bold" class="text-3xl text-[#c2ff00] mr-3" />
				<span class="text-lg font-medium group-hover:text-[#c2ff00] transition-colors">Join Our Discord</span>
			</a>
		</div>
	</section>
</div>

<style>
	.shadow-glow {
		box-shadow: 0 5px 20px -5px rgba(194, 255, 0, 0.1);
	}

	.hover\:shadow-glow:hover {
		box-shadow: 0 5px 20px -5px rgba(194, 255, 0, 0.2);
	}

	/* Particle animation canvas */
	canvas {
		pointer-events: none;
	}

	/* Beam Animation */
	.beam-path {
		stroke-dasharray: 100;
		stroke-dashoffset: 100;
		animation: beam 3s linear infinite;
	}

	@keyframes beam {
		0% {
			stroke-dashoffset: 100;
			opacity: 0;
		}
		50% {
			opacity: 1;
		}
		100% {
			stroke-dashoffset: -100;
			opacity: 0;
		}
	}

	/* Active step highlight */
	.active {
		border-color: rgba(194, 255, 0, 0.3);
	}
</style>
