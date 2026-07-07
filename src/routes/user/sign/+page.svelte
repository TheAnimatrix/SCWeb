<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { toastStore } from '$lib/client/toastStore';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import { validatePassword } from '$lib/types/helper.js';
	import { removePostLoginURL, setPostLoginURL } from '$lib/client/postLogin.js';
	import { DotGrid } from '$lib/components/sc';
	import DriftParticles from '$lib/components/effects/DriftParticles.svelte';
	import { Breadcrumbs, ScLogo } from '$lib/components/shell';
	import { theme } from '$lib/client/theme';
	import { ScButton, ScInput } from '$lib/components/sc';
	import Mail from '@lucide/svelte/icons/mail';
	import Lock from '@lucide/svelte/icons/lock';
	import User from '@lucide/svelte/icons/user';

	const PUBLIC_SITE_URL = env.PUBLIC_SITE_URL == undefined ? null : env.PUBLIC_SITE_URL;
	const PUBLIC_VERCEL_URL = env.PUBLIC_VERCEL_URL == undefined ? null : env.PUBLIC_VERCEL_URL;

	const postLoginPath = $page.url.searchParams.get('postLogin');

	$effect(() => {
		if (postLoginPath) {
			setPostLoginURL(postLoginPath);
		} else {
			removePostLoginURL();
		}
	});

	let { data } = $props();

	const getURL = () => {
		let url = PUBLIC_SITE_URL ?? PUBLIC_VERCEL_URL ?? 'http://192.168.0.208:5173/auth/callback';
		url = url.includes('http') ? url : `https://${url}`;
		return url;
	};

	let isAuthLoading = $state(false);

	async function signWithGoogle(register: boolean) {
		isAuthLoading = true;
		try {
			const { error } = await data.supabase_lt.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: getURL()
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
			isAuthLoading = false;
		}
	}

	async function signInWithEmail() {
		if (isAuthLoading) return;
		isAuthLoading = true;
		const { error } = await data.supabase_lt.auth.signInWithPassword({
			email: emailLogin,
			password: passwordLogin
		});
		isAuthLoading = false;
		if (error) {
			errorShow = 1;
			errorText = error.message;
		} else {
			goto(postLoginPath ?? '/', { replaceState: true });
			removePostLoginURL();
		}
	}

	async function signUpNewUser() {
		if (isAuthLoading) return;
		const k = validatePassword(passwordRegister ?? '', passwordRegister ?? '');

		if (k.error) {
			errorShow = 2;
			errorText = k.msg ?? 'Invalid password';
			return;
		}
		isAuthLoading = true;

		const { data: usernameCheck } = await data.supabase_lt.rpc('check_username', {
			desired_username: usernameRegister
		});
		if (usernameCheck) {
			errorShow = 2;
			errorText = 'Username not available';
			isAuthLoading = false;
			return;
		}

		const { data: signUpData, error } = await data.supabase_lt.auth.signUp({
			email: emailRegister,
			password: passwordRegister,
			options: {
				emailRedirectTo: `http://localhost:5173/user/profile`
			}
		});
		await data.supabase_lt
			.from('users')
			.update({ username: usernameRegister })
			.eq('id', signUpData.user?.id)
			.select();
		isAuthLoading = false;
		if (error) {
			errorShow = 2;
			errorText = error.message;
		} else if (signUpData && !signUpData.session) {
			goto(postLoginPath ?? '/', { replaceState: true });
			removePostLoginURL();
		}
	}

	let emailLogin = $state('');
	let emailRegister = $state('');
	let usernameRegister = $state('');
	let passwordRegister = $state('');
	let passwordLogin = $state('');
	let errorText = $state('');
	let errorShow = $state(0);

	onMount(() => {
		if (postLoginPath) {
			const decodedPath = decodeURIComponent(postLoginPath);
			if (decodedPath === '/3dp-portal/maker') {
				toastStore.show('Ready to join our 3D Printer Network? Log in to apply!', 'info', 20000);
			} else {
				toastStore.show(`Please log in to access: ${decodedPath}`, 'info');
			}
		}
	});
</script>

<div class="min-h-screen bg-background text-foreground">
	<DotGrid class="relative overflow-hidden border-b border-border">
		<DriftParticles />
		<div class="relative z-10 mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-12 text-center">
			<a href="/" class="inline-flex">
				<ScLogo variant={$theme === 'light' ? 'light' : 'dark'} />
			</a>

			<div class="space-y-2">
				<p class="font-mono text-xs uppercase tracking-wider text-muted-foreground">account</p>
				<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Sign in to SelfCrafted</h1>
				<p class="text-sm leading-relaxed text-muted-foreground">
					Join our community of makers and creators.
				</p>
			</div>

			<Breadcrumbs items={[{ label: 'home', href: '/' }, { label: 'sign_in' }]} />
		</div>
	</DotGrid>

	<div class="mx-auto max-w-md px-4 py-10">
		<Tabs.Root value="Login" class="w-full">
			<Tabs.List class="mb-6 grid h-auto w-full grid-cols-2 gap-1 p-1">
				<Tabs.Trigger value="Login" class="font-mono text-xs uppercase tracking-wide">
					login
				</Tabs.Trigger>
				<Tabs.Trigger value="Register" class="font-mono text-xs uppercase tracking-wide">
					register
				</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="Login">
				<div class="rounded-md border border-border bg-card p-6">
					<form
						onsubmit={(e) => {
							e.preventDefault();
							signInWithEmail();
						}}
						class="space-y-4"
					>
						<ScInput
							id="login-email"
							label="email"
							type="email"
							bind:value={emailLogin}
							placeholder="you@example.com"
							autocomplete="email"
							required
							icon={Mail}
						/>

						<ScInput
							id="login-password"
							label="password"
							type="password"
							bind:value={passwordLogin}
							placeholder="••••••••"
							autocomplete="current-password"
							required
							icon={Lock}
						/>

						{#if errorShow === 1}
							<p
								class="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
								role="alert"
							>
								{errorText}
							</p>
						{/if}

						<ScButton
							class="w-full justify-center"
							disabled={isAuthLoading}
							onclick={(e) => {
								e.preventDefault();
								signInWithEmail();
							}}
						>
							{isAuthLoading ? 'Signing in…' : 'Sign in'}
						</ScButton>

						<div class="relative py-2">
							<div class="absolute inset-0 flex items-center" aria-hidden="true">
								<div class="w-full border-t border-border"></div>
							</div>
							<div class="relative flex justify-center">
								<span class="bg-card px-2 font-mono text-xs text-muted-foreground">
									or continue with
								</span>
							</div>
						</div>

						<Button
							type="button"
							variant="outline"
							class="w-full font-mono text-xs"
							disabled={isAuthLoading}
							onclick={() => signWithGoogle(false)}
						>
							<svg class="size-4" viewBox="0 0 24 24" aria-hidden="true">
								<path
									fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="#FBBC05"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
							Google
						</Button>
					</form>
				</div>
			</Tabs.Content>

			<Tabs.Content value="Register">
				<div class="rounded-md border border-border bg-card p-6">
					<form
						onsubmit={(e) => {
							e.preventDefault();
							signUpNewUser();
						}}
						class="space-y-4"
					>
						<ScInput
							id="register-email"
							label="email"
							type="email"
							bind:value={emailRegister}
							placeholder="you@example.com"
							autocomplete="email"
							required
							icon={Mail}
						/>

						<ScInput
							id="register-username"
							label="username"
							type="text"
							bind:value={usernameRegister}
							placeholder="your_handle"
							autocomplete="username"
							required
							icon={User}
						/>

						<ScInput
							id="register-password"
							label="password"
							type="password"
							bind:value={passwordRegister}
							placeholder="••••••••"
							autocomplete="new-password"
							required
							icon={Lock}
						/>

						{#if errorShow === 2}
							<p
								class="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
								role="alert"
							>
								{errorText}
							</p>
						{/if}

						<ScButton
							class="w-full justify-center"
							disabled={isAuthLoading}
							onclick={(e) => {
								e.preventDefault();
								signUpNewUser();
							}}
						>
							{isAuthLoading ? 'Creating account…' : 'Create account'}
						</ScButton>

						<div class="relative py-2">
							<div class="absolute inset-0 flex items-center" aria-hidden="true">
								<div class="w-full border-t border-border"></div>
							</div>
							<div class="relative flex justify-center">
								<span class="bg-card px-2 font-mono text-xs text-muted-foreground">
									or continue with
								</span>
							</div>
						</div>

						<Button
							type="button"
							variant="outline"
							class="w-full font-mono text-xs"
							disabled={isAuthLoading}
							onclick={() => signWithGoogle(true)}
						>
							<svg class="size-4" viewBox="0 0 24 24" aria-hidden="true">
								<path
									fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="#FBBC05"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
							Google
						</Button>
					</form>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</div>
