<script lang="ts">
	import { writable, type Writable } from 'svelte/store';
	import {env} from '$env/dynamic/public';
	const PUBLIC_SITE_URL = (env.PUBLIC_SITE_URL == undefined)? null : env.PUBLIC_SITE_URL;
	const PUBLIC_VERCEL_URL = (env.PUBLIC_VERCEL_URL == undefined)? null : env.PUBLIC_VERCEL_URL;
	import { getContext, onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { goto, invalidate, replaceState } from '$app/navigation';
	import {setLoading } from '$lib/client/loading.js';
	import GlowleftInput from '$lib/components/fundamental/glowleft_input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { validatePassword } from '$lib/types/helper.js';
	import GlowButton from '$lib/components/fundamental/GlowButton.svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	const triggerTabStyle =
		'data-[state=active]:bg-transparent data-[state=active]:shadow-glow data-[state=active]:text-[#c2ff00] px-6 py-3 text-2xl text-gray-500 rounded-xl hover:bg-[#151515] text-gray-400 font-bold transition-all duration-300';

	export let data;
	let { supabase_lt } = data;
	let smokeCanvas: HTMLCanvasElement;

	const getURL = () => {
		let url =
			PUBLIC_SITE_URL ??
			PUBLIC_VERCEL_URL ??
			'http://localhost:5173/auth/callback';
		url = url.includes('http') ? url : `https://${url}`;
		return url;
	};

	let load_store = getContext<Writable<boolean>>('loading');
	async function signWithGoogle(register: boolean) {
		setLoading(load_store, true);
		try {
			const { data, error } = await supabase_lt.auth.signInWithOAuth({
				provider: 'google',
				options: {
					queryParams: {},
					redirectTo: getURL() + '?next=/user/profile/account/'
				}
			});
			
			if (error) {
				errorShow = register ? 2 : 1;
				errorText = error.message;
			}
		} catch (err) {
			errorShow = register ? 2 : 1;
			errorText = err instanceof Error ? err.message : 'An unknown error occurred';
		} finally {
			setLoading(load_store, false);
		}
	}

	async function signInWithEmail() {
		setLoading(load_store,true);
		const { data, error } = await supabase_lt.auth.signInWithPassword({
			email: emailLogin,
			password: passwordLogin
		});
		setLoading(load_store,false);
		if (error) {
			errorShow = 1;
			errorText = error.message;
		}
	}

	async function signUpNewUser() {
		let k = validatePassword(passwordRegister ?? '', passwordRegister ?? '');
		
		if (k.error) {
			errorShow = 2;
			errorText = k.msg ?? 'yoyo';
			return;
		}
		setLoading(load_store,true);
		const { data, error } = await supabase_lt.auth.signUp({
			email: emailRegister,
			password: passwordRegister,
			options: {
				emailRedirectTo: `http://localhost:5173/user/profile`
			}
		});
		let userNameUpdate = await supabase_lt
			.from('users')
			.update({ username: usernameRegister })
			.eq('id', data.user?.id)
			.select();
		setLoading(load_store,false);
		if (error) {
			errorShow = 2;
			errorText = error.message;
		} else if (data && !data.session)
			errorText = `Please confirm your account to login. E-mail sent to ${emailRegister}`;
	}

	let emailLogin: string,
		emailRegister: string,
		usernameRegister: string,
		passwordRegister: string,
		passwordLogin: string,
		errorText: string,
		errorShow: number = 0;

	onMount(() => {
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

			const particles: Particle[] = [];
			const particleCount = 40;

			function createParticle(): Particle {
				const radius = Math.random() * 180 + 120;
				return {
					x: Math.random() * smokeCanvas.width,
					y: smokeCanvas.height + radius,
					radius: radius,
					color: `rgba(${194}, ${255}, ${0}, 0.15)`,
					velocity: {
						x: (Math.random() - 0.5) * 0.4,
						y: -Math.random() * 0.7 - 0.4
					},
					alpha: 0.07 + Math.random() * 0.08,
					decreasing: Math.random() > 0.5
				};
			}

			// Create initial particles
			for (let i = 0; i < particleCount; i++) {
				particles.push(createParticle());
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
	});
</script>

<div class="min-h-screen bg-[#0c0c0c] text-white relative overflow-hidden">
	<!-- Animated Background -->
	<div class="absolute inset-0 bg-[#0a0a0a] z-0"></div>
	
	<!-- Animated Green Smoke Plumes -->
	<div class="smoke-container absolute inset-0 z-0 opacity-40 overflow-hidden">
		<canvas bind:this={smokeCanvas} class="w-full h-full"></canvas>
	</div>
	
	<!-- Glowing accents -->
	<div class="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#c2ff00] opacity-5 blur-[150px] rounded-full"></div>
	<div class="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-[#c2ff00] opacity-5 blur-[150px] rounded-full"></div>

	<div class="relative z-10 container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen">
		<!-- Logo/Brand -->
		<div class="text-center mb-12" in:fly="{{ y: -20, duration: 800, delay: 200, easing: cubicOut }}">
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-4 h-4 rounded-full bg-[#c2ff00] mr-2"></span>
				<span class="text-[#c2ff00] text-sm uppercase tracking-wider font-medium">Welcome Back</span>
			</div>
			<h1 class="text-4xl font-bold mb-2">Sign in to SelfCrafted</h1>
			<p class="text-gray-400">Join our community of makers and creators</p>
		</div>

		<!-- Auth Container -->
		<div class="w-full max-w-md" in:fly="{{ y: 20, duration: 800, delay: 400, easing: cubicOut }}">
			<Tabs.Root
				value="Login"
				class="w-full flex flex-col items-center"
			>
				<Tabs.List class="flex p-8 gap-1 rounded-2xl bg-[#000000]/50 backdrop-blur-xl mb-8 border border-[#252525]">
					<Tabs.Trigger 
						class="flex-1 flex items-center justify-center gap-2 px-8 py-2 rounded-xl font-bold text-xl transition-all duration-300 data-[state=active]:bg-[#c2ff00]/10 data-[state=active]:text-[#c2ff00] text-gray-400 hover:bg-white/5" 
						value="Login"
					>
						<Icon icon="ph:sign-in-bold" class="text-2xl" />
						Login
					</Tabs.Trigger>
					<Tabs.Trigger 
						class="flex-1 flex items-center justify-center gap-2 px-8 py-2 rounded-xl font-bold text-xl transition-all duration-300 data-[state=active]:bg-[#c2ff00]/10 data-[state=active]:text-[#c2ff00] text-gray-400 hover:bg-white/5"
						value="Register"
					>
						<Icon icon="ph:user-plus-bold" class="text-2xl" />
						Register
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="Login" class="w-full">
					<div class="bg-[#000000]/50 backdrop-blur-xl rounded-2xl p-8 border border-[#252525] transition-all duration-300 hover:shadow-glow-lg" 
						 in:fly="{{ y: 20, duration: 500, delay: 600, easing: cubicOut }}">
						<form on:submit|preventDefault class="space-y-6">
							<div>
								<GlowleftInput
									placeholder="E-Mail/Username"
									gradient="bg-[linear-gradient(273deg,_#c2ff00_0%,_#86b100_100%)]"
									f11="[box-shadow:0px_9px_34px_6px_rgba(194,_255,_0,_0.31)]"
									f21="bg-[rgba(28,38,0,0.40)]"
									f22="bg-[rgba(18,24,0,0.40)]"
									class="w-full"
									bind:value={emailLogin}
									icon="ph:envelope-simple-bold"
									iconPosition="left"
									textAlign="left"
									pulseOnFocus={true}
									glowStrength="medium"
								/>
							</div>
							<div>
								<GlowleftInput
									placeholder="Password"
									gradient="bg-[linear-gradient(273deg,_#c2ff00_0%,_#86b100_100%)]"
									f11="[box-shadow:0px_9px_34px_6px_rgba(194,_255,_0,_0.31)]"
									f21="bg-[rgba(28,38,0,0.40)]"
									f22="bg-[rgba(18,24,0,0.40)]"
									class="w-full"
									type="password"
									bind:value={passwordLogin}
									icon="ph:lock-simple-bold"
									iconPosition="left"
									textAlign="left"
									pulseOnFocus={true}
									glowStrength="medium"
								/>
							</div>

							{#if errorShow === 1}
								<div class="text-red-500 text-sm font-medium p-3 rounded bg-red-500/10 border border-red-500/20">
									{errorText}
								</div>
							{/if}

							<button
								class="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 hover:bg-white/10 border border-[#252525] rounded-xl transition-all duration-300 hover:shadow-glow"
								type="submit"
								on:click={signInWithEmail}
							>
								<Icon icon="ph:sign-in-bold" class="text-2xl" />
								<span class="text-white font-medium">Sign In</span>
							</button>

							<div class="relative">
								<div class="absolute inset-0 flex items-center">
									<div class="w-full border-t border-[#252525]"></div>
								</div>
								<div class="relative flex justify-center text-sm">
									<span class="px-2 bg-[#151515] text-gray-400">Or continue with</span>
								</div>
							</div>

							<button
								class="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 hover:bg-white/10 border border-[#252525] rounded-xl transition-all duration-300 hover:shadow-glow"
								on:click={() => signWithGoogle(false)}
							>
								<Icon icon="logos:google-icon" class="text-2xl" />
								<span class="text-white font-medium">Google</span>
							</button>
						</form>
					</div>
				</Tabs.Content>

				<Tabs.Content value="Register" class="w-full">
					<div class="bg-[#000000]/50 backdrop-blur-xl  rounded-2xl p-8 border border-[#252525] shadow-glow transition-all duration-300 hover:shadow-glow-lg">
						<form on:submit|preventDefault class="space-y-6">
							<div>
								<GlowleftInput
									placeholder="E-Mail"
									gradient="bg-[linear-gradient(273deg,_#c2ff00_0%,_#86b100_100%)]"
									f11="[box-shadow:0px_9px_34px_6px_rgba(194,_255,_0,_0.31)]"
									f21="bg-[rgba(28,38,0,0.40)]"
									f22="bg-[rgba(18,24,0,0.40)]"
									class="w-full"
									bind:value={emailRegister}
									icon="ph:envelope-simple-bold"
									iconPosition="left"
									textAlign="left"
									pulseOnFocus={true}
									glowStrength="medium"
								/>
							</div>
							<div>
								<GlowleftInput
									placeholder="Username"
									gradient="bg-[linear-gradient(273deg,_#c2ff00_0%,_#86b100_100%)]"
									f11="[box-shadow:0px_9px_34px_6px_rgba(194,_255,_0,_0.31)]"
									f21="bg-[rgba(28,38,0,0.40)]"
									f22="bg-[rgba(18,24,0,0.40)]"
									class="w-full"
									bind:value={usernameRegister}
									icon="ph:user-bold"
									iconPosition="left"
									textAlign="left"
									pulseOnFocus={true}
									glowStrength="medium"
								/>
							</div>
							<div>
								<GlowleftInput
									placeholder="Password"
									gradient="bg-[linear-gradient(273deg,_#c2ff00_0%,_#86b100_100%)]"
									f11="[box-shadow:0px_9px_34px_6px_rgba(194,_255,_0,_0.31)]"
									f21="bg-[rgba(28,38,0,0.40)]"
									f22="bg-[rgba(18,24,0,0.40)]"
									class="w-full"
									type="password"
									bind:value={passwordRegister}
									icon="ph:lock-simple-bold"
									iconPosition="left"
									textAlign="left"
									pulseOnFocus={true}
									glowStrength="medium"
								/>
							</div>

							{#if errorShow === 2}
								<div class="text-red-500 text-sm font-medium p-3 rounded bg-red-500/10 border border-red-500/20">
									{errorText}
								</div>
							{/if}

							<button
								class="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 hover:bg-white/10 border border-[#252525] rounded-xl transition-all duration-300 hover:shadow-glow"
								on:click={signUpNewUser}
							>
								<Icon icon="ph:user-plus-bold" class="text-2xl" />
								<span class="text-white font-medium">Create Account</span>
							</button>

							<div class="relative">
								<div class="absolute inset-0 flex items-center">
									<div class="w-full border-t border-[#252525]"></div>
								</div>
								<div class="relative flex justify-center text-sm">
									<span class="px-2 bg-[#151515] text-gray-400">Or continue with</span>
								</div>
							</div>

							<button
								class="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 hover:bg-white/10 border border-[#252525] rounded-xl transition-all duration-300 hover:shadow-glow"
								on:click={() => signWithGoogle(true)}
							>
								<Icon icon="logos:google-icon" class="text-2xl" />
								<span class="text-white font-medium">Google</span>
							</button>
						</form>
					</div>
				</Tabs.Content>
			</Tabs.Root>
		</div>
	</div>
</div>

<style lang="postcss">
	.shadow-glow {
		box-shadow: 0 4px 20px -5px rgba(194, 255, 0, 0.1);
	}

	.shadow-glow-lg {
		box-shadow: 0 8px 30px -5px rgba(194, 255, 0, 0.2);
	}

	/* Smoke container styles */
	.smoke-container {
		mix-blend-mode: screen;
		pointer-events: none;
	}

	/* Animation keyframes */
	@keyframes pulse {
		0% { opacity: 0.6; }
		100% { opacity: 1; }
	}

	@keyframes float {
		0% { transform: translateY(0px); }
		50% { transform: translateY(-20px); }
		100% { transform: translateY(0px); }
	}

	/* Transitions */
	.transition-all {
		transition-property: all;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		transition-duration: 300ms;
	}

	/* Input focus styles */
	input:focus {
		outline: none;
		box-shadow: 0 0 0 2px rgba(194, 255, 0, 0.2);
	}

	/* Button hover effects */
	button:hover {
		transform: translateY(-1px);
	}

	button:active {
		transform: translateY(0px);
	}
	
	/* Tab switching animation */
	:global(.tab-content-enter) {
		transform: translateY(10px);
		opacity: 0;
	}
	
	:global(.tab-content-enter-active) {
		transform: translateY(0);
		opacity: 1;
		transition: all 0.3s ease-out;
	}
	
	:global(.tab-content-exit) {
		transform: translateY(0);
		opacity: 1;
	}
	
	:global(.tab-content-exit-active) {
		transform: translateY(-10px);
		opacity: 0;
		transition: all 0.3s ease-in;
	}
</style>
