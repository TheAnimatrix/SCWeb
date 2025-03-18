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

		// Set canvas dimensions and adjust for device pixel ratio for sharper rendering
		const pixelRatio = window.devicePixelRatio || 1;
		canvas.width = canvas.offsetWidth * pixelRatio;
		canvas.height = canvas.offsetHeight * pixelRatio;
		canvas.style.width = `${canvas.offsetWidth}px`;
		canvas.style.height = `${canvas.offsetHeight}px`;
		ctx.scale(pixelRatio, pixelRatio);

		// Cache the accent color once instead of on every frame
		const tempDiv = document.createElement('div');
		tempDiv.style.color = 'hsl(var(--accent))';
		document.body.appendChild(tempDiv);
		const computedColor = window.getComputedStyle(tempDiv).color;
		document.body.removeChild(tempDiv);
		const rgbMatch = computedColor.match(/\d+/g);
		const [r, g, b] = rgbMatch ? rgbMatch.map(Number) : [194, 255, 0];
		
		const particles: Array<{
			x: number;
			y: number;
			size: number;
			speedX: number;
			speedY: number;
			opacity: number;
			glowSize: number;
			glowIntensity: number;
			glowPhase: number;
			phaseIncrement: number;
			colorFactor: number; // 0 = accent color, 1 = white
			saturationFactor: number; // 0 = desaturated, 1 = full saturation
		}> = [];

		// Helper function to convert RGB to HSL
		function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
			r /= 255;
			g /= 255;
			b /= 255;
			
			const max = Math.max(r, g, b);
			const min = Math.min(r, g, b);
			let h = 0, s = 0;
			const l = (max + min) / 2;
			
			if (max !== min) {
				const d = max - min;
				s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
				
				switch (max) {
					case r: h = (g - b) / d + (g < b ? 6 : 0); break;
					case g: h = (b - r) / d + 2; break;
					case b: h = (r - g) / d + 4; break;
				}
				
				h /= 6;
			}
			
			return [h, s, l];
		}
		
		// Helper function to convert HSL to RGB
		function hslToRgb(h: number, s: number, l: number): [number, number, number] {
			let r, g, b;
			
			if (s === 0) {
				r = g = b = l;
			} else {
				const hue2rgb = (p: number, q: number, t: number) => {
					if (t < 0) t += 1;
					if (t > 1) t -= 1;
					if (t < 1/6) return p + (q - p) * 6 * t;
					if (t < 1/2) return q;
					if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
					return p;
				};
				
				const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
				const p = 2 * l - q;
				
				r = hue2rgb(p, q, h + 1/3);
				g = hue2rgb(p, q, h);
				b = hue2rgb(p, q, h - 1/3);
			}
			
			return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
		}

		// Actual canvas dimensions for calculations (accounting for pixelRatio)
		const canvasWidth = canvas.offsetWidth;
		const canvasHeight = canvas.offsetHeight;

		for (let i = 0; i < 100; i++) {
			// Determine if this will be a fast particle (about 10% of particles)
			const isFastParticle = Math.random() < 0.1;
			
			particles.push({
				x: Math.random() * canvasWidth,
				y: Math.random() * canvasHeight,
				size: Math.random() * 3 + 1.5,
				speedX: (Math.random() - 0.5) * (isFastParticle ? 2 : 0.4),
				speedY: (Math.random() - 0.5) * (isFastParticle ? 2 : 0.4),
				opacity: Math.random() * 0.3 + 0.7,
				glowSize: Math.random() * 15 + 8,
				glowIntensity: Math.random() * 0.4 + 0.6,
				glowPhase: Math.random() * Math.PI * 2,
				phaseIncrement: 0.01 + Math.random() * 0.01,
				colorFactor: Math.random(), // Random value between 0-1 for color spectrum
				saturationFactor: Math.random() * 0.6 + 0.4 // Random saturation between 40-100%
			});
		}

		let lastTime = 0;
		
		function animate(timestamp: number) {
			if (!ctx) return;
			
			// Calculate delta time for smooth animation regardless of frame rate
			const deltaTime = timestamp - lastTime || 1;
			lastTime = timestamp;
			const timeMultiplier = deltaTime / 16.67; // Normalize to 60fps (16.67ms)
			
			ctx.clearRect(0, 0, canvasWidth, canvasHeight);
			
			particles.forEach(particle => {
				if (!ctx) return;
				
				// Update position with time-based movement
				particle.x += particle.speedX * timeMultiplier;
				particle.y += particle.speedY * timeMultiplier;
				particle.glowPhase += particle.phaseIncrement * timeMultiplier;

				// Screen wrapping
				if (particle.x < 0) particle.x = canvasWidth;
				if (particle.x > canvasWidth) particle.x = 0;
				if (particle.y < 0) particle.y = canvasHeight;
				if (particle.y > canvasHeight) particle.y = 0;

				// Pulsating glow effect with stronger variation
				const glowPulse = Math.sin(particle.glowPhase) * 0.5 + 0.8;

				// Calculate color between accent and white based on colorFactor
				const particleR = r + Math.round((255 - r) * particle.colorFactor);
				const particleG = g + Math.round((255 - g) * particle.colorFactor);
				const particleB = b + Math.round((255 - b) * particle.colorFactor);
				
				// Apply saturation variation
				const [h, s, l] = rgbToHsl(particleR, particleG, particleB);
				const adjustedSaturation = s * particle.saturationFactor;
				const [finalR, finalG, finalB] = hslToRgb(h, adjustedSaturation, l);

				// Draw glow with stronger effect
				const gradient = ctx.createRadialGradient(
					particle.x, 
					particle.y, 
					0, 
					particle.x, 
					particle.y, 
					particle.glowSize * glowPulse
				);
				gradient.addColorStop(0, `rgba(${finalR}, ${finalG}, ${finalB}, ${particle.glowIntensity * glowPulse})`);
				gradient.addColorStop(0.4, `rgba(${finalR}, ${finalG}, ${finalB}, ${particle.glowIntensity * 0.5})`);
				gradient.addColorStop(1, `rgba(${finalR}, ${finalG}, ${finalB}, 0)`);
				
				ctx.beginPath();
				ctx.arc(particle.x, particle.y, particle.glowSize * glowPulse, 0, Math.PI * 2);
				ctx.fillStyle = gradient;
				ctx.fill();

				// Draw particle with higher opacity and larger core
				ctx.beginPath();
				ctx.arc(particle.x, particle.y, particle.size * 1.2, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(${finalR}, ${finalG}, ${finalB}, ${particle.opacity})`;
				ctx.fill();
			});

			requestAnimationFrame(animate);
		}

		// Handle window resize to prevent jumps when window size changes
		const resizeObserver = new ResizeObserver(() => {
			const pixelRatio = window.devicePixelRatio || 1;
			const newWidth = canvas.offsetWidth * pixelRatio;
			const newHeight = canvas.offsetHeight * pixelRatio;
			
			// Only update if dimensions actually changed
			if (canvas.width !== newWidth || canvas.height !== newHeight) {
				const widthRatio = newWidth / canvas.width;
				const heightRatio = newHeight / canvas.height;
				
				canvas.width = newWidth;
				canvas.height = newHeight;
				canvas.style.width = `${canvas.offsetWidth}px`;
				canvas.style.height = `${canvas.offsetHeight}px`;
				ctx.scale(pixelRatio, pixelRatio);
				
				// Adjust particle positions to new canvas size
				particles.forEach(particle => {
					particle.x *= widthRatio;
					particle.y *= heightRatio;
				});
			}
		});
		
		resizeObserver.observe(canvas);
		requestAnimationFrame(animate);

		return () => {
			resizeObserver.disconnect();
		};
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
				<span class="w-4 h-4 rounded-full bg-accent mr-2"></span>
				<span class="text-accent text-sm uppercase tracking-wider font-medium">Start Crafting</span>
			</div>
			<h1 class="text-4xl md:text-5xl font-bold mb-6">
				Turn Your Creation Into
				<span class="text-accent">Reality</span>
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

			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
				{#each craftingSteps as step, i}
					<button
						class="bg-[#151515]/40 backdrop-blur-xl rounded-2xl p-6 border border-[#252525] hover:border-[#353535] transition-all hover:shadow-glow group relative overflow-hidden {currentStep === i ? 'active' : ''}"
						on:mouseenter={() => currentStep = i}
					>
						<!-- Glow Effect -->
						<div class="absolute inset-0 bg-accent opacity-0 group-hover:opacity-5 transition-opacity duration-300 blur-2xl"></div>
						
						<div class="relative z-10 text-left">
							<div class="w-14 h-14 rounded-xl flex items-center justify-center mb-4 border border-accent/30 group-hover:border-accent/50 transition-all duration-300 bg-accent/5">
								<Icon icon={step.icon} class="text-3xl text-accent" />
							</div>
							<h3 class="text-xl font-bold mb-2 text-accent group-hover:translate-y-[-2px] transition-all duration-300">
								{step.title}
							</h3>
							<p class="text-gray-400 group-hover:text-gray-300 transition-colors duration-300 mb-2">
								{step.description}
							</p>
							<p class="text-sm text-gray-500 group-hover:text-gray-400 transition-colors duration-300">
								{step.details}
							</p>
						</div>
					</button>
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
							<Icon icon={service.icon} class="text-3xl text-accent" />
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
				class="inline-flex items-center justify-center px-8 py-4 bg-[#151515] hover:bg-[#252525] rounded-xl border border-[#353535] hover:border-accent transition-all group"
			>
				<Icon icon="ph:discord-logo-bold" class="text-3xl text-accent mr-3" />
				<span class="text-lg font-medium group-hover:text-accent transition-colors">Join Our Discord</span>
			</a>
		</div>
	</section>
</div>

<style lang="postcss">
	.shadow-glow {
		@apply shadow-accent/10;
	}

	.hover\:shadow-glow:hover {
		@apply shadow-accent/20;
	}

	/* Particle animation canvas */
	canvas {
		pointer-events: none;
	}

	/* Active step highlight */
	.active {
		@apply border-accent/30;
	}
</style>
