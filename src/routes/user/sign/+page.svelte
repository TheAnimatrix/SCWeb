<script lang="ts">
	import { createBubbler, preventDefault } from 'svelte/legacy';

	const bubble = createBubbler();
	import { writable, type Writable } from 'svelte/store';
	import {env} from '$env/dynamic/public';
	const PUBLIC_SITE_URL = (env.PUBLIC_SITE_URL == undefined)? null : env.PUBLIC_SITE_URL;
	const PUBLIC_VERCEL_URL = (env.PUBLIC_VERCEL_URL == undefined)? null : env.PUBLIC_VERCEL_URL;
	import { getContext, onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { goto, invalidate, replaceState } from '$app/navigation';
	import { page } from '$app/stores'; // Import page store
	import { toastStore } from '$lib/client/toastStore'; // Import custom toast store
	import {setLoading } from '$lib/client/loading.js';
	import GlowleftInput from '$lib/components/fundamental/glowleft_input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { validatePassword } from '$lib/types/helper.js';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Smoke from '$lib/components/effects/Smoke.svelte';

	const postLoginPath = $page.url.searchParams.get('postLogin');
	const triggerTabStyle =
		'data-[state=active]:bg-transparent data-[state=active]:shadow-glow data-[state=active]:text-accent px-6 py-3 text-2xl text-gray-500 rounded-xl hover:bg-[#151515] text-gray-400 font-bold transition-all duration-300';

	let { data } = $props();
	let { supabase_lt } = data;

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
					queryParams: {
						
					},
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

	let emailLogin: string = $state('');
	let emailRegister: string = $state('');
	let usernameRegister: string = $state('');
	let passwordRegister: string = $state('');
	let passwordLogin: string = $state('');
	let errorText: string = $state('');
	let errorShow: number = $state(0);

	onMount(() => {
		// Access the reactive page store value with $page
		if (postLoginPath) {
			// You might want to decode the path if it's URL encoded
			const decodedPath = decodeURIComponent(postLoginPath); // Decode for better display
			if (decodedPath === '/3dp-portal/maker') {
				toastStore.show('Ready to join our 3D Printer Network? Log in to apply!', 'info', 20000);
			} else {
				toastStore.show(`Please log in to access: ${decodedPath}`, 'info');
			}

			// Optionally remove the query param from the URL without reloading
			// const url = new URL(window.location.href);
			// url.searchParams.delete('postLogin');
			// replaceState(url, {});
		}
	});
</script>

<div class="min-h-screen bg-[#0c0c0c] text-white relative overflow-hidden">
	<!-- Animated Background -->
	<div class="absolute inset-0 bg-[#0a0a0a] z-0"></div>
	
	<!-- Animated Green Smoke Plumes -->
	<div class="absolute inset-0 z-0">
		<!-- Using default accent color -->
		<Smoke opacity={0.4} particleCount={40} />
	</div>
	
	<!-- Glowing accents -->
	<div class="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-accent opacity-5 blur-[150px] rounded-full"></div>
	<div class="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-accent opacity-5 blur-[150px] rounded-full"></div>

	<div class="relative z-10 container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen">
		<!-- Logo/Brand -->
		<div class="text-center mb-12" in:fly="{{ y: -20, duration: 800, delay: 200, easing: cubicOut }}">
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-4 h-4 rounded-full bg-accent mr-2"></span>
				<span class="text-accent text-sm uppercase tracking-wider font-medium">Welcome Back</span>
			</div>
			<div class="text-4xl font-bold mb-2">Sign in to SelfCrafted</div>
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
						class="flex-1 flex items-center justify-center gap-2 px-8 py-2 rounded-xl font-bold text-xl transition-all duration-300 data-[state=active]:bg-accent/10 data-[state=active]:text-accent text-gray-400 hover:bg-white/5" 
						value="Login"
					>
						<Icon icon="ph:sign-in-bold" class="text-2xl" />
						Login
					</Tabs.Trigger>
					<Tabs.Trigger 
						class="flex-1 flex items-center justify-center gap-2 px-8 py-2 rounded-xl font-bold text-xl transition-all duration-300 data-[state=active]:bg-accent/10 data-[state=active]:text-accent text-gray-400 hover:bg-white/5"
						value="Register"
					>
						<Icon icon="ph:user-plus-bold" class="text-2xl" />
						Register
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="Login" class="w-full">
					<div class="bg-[#000000]/50 backdrop-blur-xl rounded-2xl p-8 border border-[#252525] transition-all duration-300 hover:shadow-glow-lg" 
						 in:fly="{{ y: 20, duration: 500, delay: 600, easing: cubicOut }}">
						<form onsubmit={preventDefault(bubble('submit'))} class="space-y-6">
							<div>
								<GlowleftInput
									placeholder="E-Mail/Username"
									bind:value={emailLogin}
									icon="ph:envelope-simple-bold"
									iconPosition="left"
									pulseOnFocus={true}
								/>
							</div>
							<div>
								<GlowleftInput
									placeholder="Password"
									type="password"
									bind:value={passwordLogin}
									icon="ph:lock-simple-bold"
									iconPosition="left"
									pulseOnFocus={true}
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
								onclick={signInWithEmail}
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
								onclick={() => signWithGoogle(false)}
							>
								<Icon icon="logos:google-icon" class="text-2xl" />
								<span class="text-white font-medium">Google</span>
							</button>
						</form>
					</div>
				</Tabs.Content>

				<Tabs.Content value="Register" class="w-full">
					<div class="bg-[#000000]/50 backdrop-blur-xl  rounded-2xl p-8 border border-[#252525] shadow-glow transition-all duration-300 hover:shadow-glow-lg">
						<form onsubmit={preventDefault(bubble('submit'))} class="space-y-6">
							<div>
								<GlowleftInput
									placeholder="E-Mail"
									bind:value={emailRegister}
									icon="ph:envelope-simple-bold"
									iconPosition="left"
									pulseOnFocus={true}
								/>
							</div>
							<div>
								<GlowleftInput
									placeholder="Username"
									bind:value={usernameRegister}
									icon="ph:user-bold"
									iconPosition="left"
									pulseOnFocus={true}
								/>
							</div>
							<div>
								<GlowleftInput
									placeholder="Password"
									type="password"
									bind:value={passwordRegister}
									icon="ph:lock-simple-bold"
									iconPosition="left"
									pulseOnFocus={true}
								/>
							</div>

							{#if errorShow === 2}
								<div class="text-red-500 text-sm font-medium p-3 rounded bg-red-500/10 border border-red-500/20">
									{errorText}
								</div>
							{/if}

							<button
								class="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 hover:bg-white/10 border border-[#252525] rounded-xl transition-all duration-300 hover:shadow-glow"
								onclick={signUpNewUser}
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
								onclick={() => signWithGoogle(true)}
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

<style>
	.shadow-glow {
		box-shadow: 0 4px 20px -5px rgba(194, 255, 0, 0.1);
	}

	.shadow-glow-lg {
		box-shadow: 0 8px 30px -5px rgba(194, 255, 0, 0.2);
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
