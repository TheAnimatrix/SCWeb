<script lang="ts">
	import { resolve } from '$app/paths';
	import { F } from '$lib/icons/fluent';

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { syncAuthAfterSignIn } from '$lib/client/authSync';
	import {
		signup,
		checkUsernameAvailable,
		friendlySupabaseAuthError,
		USERNAME_TAKEN_MESSAGE
	} from '$lib/client/authApi';
	import { toastStore } from '$lib/client/toastStore';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import { PASSWORD_RULES_TEXT, validatePassword } from '$lib/types/helper.js';
	import { removePostLoginURL, setPostLoginURL } from '$lib/client/postLogin.js';
	import { oauthCallbackUrl, postLoginFromSearchParams } from '$lib/postLoginUrl';
	import { DotGrid, ScButton, ScInput } from '$lib/components/sc';
	import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';
	import PasswordField from '../PasswordField.svelte';

	type TabValue = 'signin' | 'register';

	/** Paths that redirect here when the visitor isn't signed in; only these get a "Sign in to continue." toast. */
	const GUARDED_PREFIXES = ['/user/', '/portal', '/3dp-portal', '/maker/apply', '/admin'];

	let { data } = $props();

	// `postLogin` is canonical; `redirectTo` is a legacy alias still sent by some redirects.
	const postLoginPath = $derived(postLoginFromSearchParams(page.url.searchParams));

	$effect(() => {
		if (postLoginPath) {
			setPostLoginURL(postLoginPath);
		} else {
			removePostLoginURL();
		}
	});

	function supabase() {
		return requireBrowserSupabase(data.supabase);
	}

	let activeTab = $state<TabValue>('signin');
	let isAuthLoading = $state(false);
	let emailLogin = $state('');
	let emailRegister = $state('');
	let usernameRegister = $state('');
	let passwordRegister = $state('');
	let passwordLogin = $state('');
	let errorText = $state('');
	let errorShow = $state<0 | 1 | 2>(0);
	let signupPendingEmail = $state<string | null>(null);

	function showError(tab: 1 | 2, message: string) {
		errorShow = tab;
		errorText = message;
	}

	async function signWithGoogle(register: boolean) {
		isAuthLoading = true;
		errorShow = 0;
		try {
			const { error } = await supabase().auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: oauthCallbackUrl(window.location.origin, postLoginPath)
				}
			});
			if (error) {
				showError(register ? 2 : 1, friendlySupabaseAuthError(error));
			}
		} catch (err) {
			showError(
				register ? 2 : 1,
				friendlySupabaseAuthError(err instanceof Error ? { message: err.message } : null)
			);
		} finally {
			isAuthLoading = false;
		}
	}

	async function signInWithEmail() {
		if (isAuthLoading) return;
		isAuthLoading = true;
		errorShow = 0;
		const { error } = await supabase().auth.signInWithPassword({
			email: emailLogin,
			password: passwordLogin
		});
		isAuthLoading = false;
		if (error) {
			showError(1, friendlySupabaseAuthError(error));
			return;
		}
		await syncAuthAfterSignIn();
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- sanitized same-origin path
		await goto(postLoginPath ?? '/user/profile/account', { replaceState: true });
		removePostLoginURL();
	}

	async function signUpNewUser() {
		if (isAuthLoading) return;
		errorShow = 0;

		if (!/^[a-zA-Z0-9_]{3,30}$/.test(usernameRegister)) {
			showError(2, 'Usernames are 3 to 30 letters, numbers or underscores.');
			return;
		}

		const k = validatePassword(passwordRegister ?? '', passwordRegister ?? '');
		if (k.error) {
			showError(2, k.msg ?? `Your password needs ${PASSWORD_RULES_TEXT}`);
			return;
		}
		isAuthLoading = true;

		try {
			const usernameCheck = await checkUsernameAvailable(fetch, usernameRegister);
			if (!usernameCheck.ok) {
				showError(2, usernameCheck.error.message);
				return;
			}
			if (!usernameCheck.data.available) {
				showError(2, USERNAME_TAKEN_MESSAGE);
				return;
			}

			const signUpResult = await signup(fetch, {
				email: emailRegister,
				password: passwordRegister,
				username: usernameRegister
			});
			if (!signUpResult.ok) {
				showError(2, signUpResult.error.message);
				return;
			}

			if (signUpResult.data.needsConfirmation) {
				signupPendingEmail = emailRegister;
				toastStore.show('Check your e-mail to confirm your account.', 'success', 8000);
			}
		} finally {
			isAuthLoading = false;
		}
	}

	function backToSignIn() {
		if (signupPendingEmail) emailLogin = signupPendingEmail;
		signupPendingEmail = null;
		errorShow = 0;
		activeTab = 'signin';
	}

	onMount(() => {
		if (!postLoginPath) return;
		if (!GUARDED_PREFIXES.some((prefix) => postLoginPath.startsWith(prefix))) return;

		if (postLoginPath === '/3dp-portal/maker' || postLoginPath === '/portal/printing') {
			toastStore.show('Sign in to apply as a 3D printing maker.', 'info');
		} else {
			toastStore.show('Sign in to continue.', 'info');
		}
	});

	const labelClass = 'text-sm text-muted-foreground';
</script>

{#snippet googleButton(register: boolean)}
	<Button
		type="button"
		variant="outline"
		class="w-full"
		disabled={isAuthLoading}
		onclick={() => signWithGoogle(register)}>
		<svg class="size-4" viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="#4285F4"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
			<path
				fill="#34A853"
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
			<path
				fill="#FBBC05"
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
			<path
				fill="#EA4335"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
		</svg>
		Continue with Google
	</Button>
{/snippet}

{#snippet divider()}
	<div class="relative py-2">
		<div class="absolute inset-0 flex items-center" aria-hidden="true">
			<div class="w-full border-t border-border"></div>
		</div>
		<div class="relative flex justify-center">
			<span class="bg-card px-2 text-xs text-muted-foreground">or</span>
		</div>
	</div>
{/snippet}

{#snippet errorBox()}
	<p
		class="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
		role="alert">
		{errorText}
	</p>
{/snippet}

<DotGrid class="relative min-h-screen overflow-hidden">
	<div class="relative z-10 mx-auto flex max-w-md flex-col px-4 py-10">
		<h1 class="mb-6 text-2xl font-semibold tracking-tight text-foreground">
			{activeTab === 'signin' ? 'Sign in to Selfcrafted' : 'Create your Selfcrafted account'}
		</h1>

		<Tabs.Root bind:value={activeTab} class="w-full">
			<Tabs.List class="mb-6 grid h-auto w-full grid-cols-2 gap-1 p-1">
				<Tabs.Trigger value="signin" class="text-sm">Sign in</Tabs.Trigger>
				<Tabs.Trigger value="register" class="text-sm">Create account</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="signin">
				<div class="rounded-md border border-border bg-card p-6">
					<form
						onsubmit={(e) => {
							e.preventDefault();
							signInWithEmail();
						}}
						class="space-y-4">
						<ScInput
							id="login-email"
							label="E-mail"
							{labelClass}
							type="email"
							bind:value={emailLogin}
							placeholder="you@example.com"
							autocomplete="email"
							required
							icon={F.mail} />

						<PasswordField
							id="login-password"
							label="Password"
							bind:value={passwordLogin}
							autocomplete="current-password"
							required />

						<p class="text-right text-sm">
							<a
								href={resolve('/user/forgot-password')}
								class="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
								Forgot password?
							</a>
						</p>

						{#if errorShow === 1}
							{@render errorBox()}
						{/if}

						<ScButton type="submit" class="w-full justify-center" disabled={isAuthLoading}>
							{isAuthLoading ? 'Signing in…' : 'Sign in'}
						</ScButton>

						{@render divider()}
						{@render googleButton(false)}
					</form>
				</div>
			</Tabs.Content>

			<Tabs.Content value="register">
				<div class="rounded-md border border-border bg-card p-6">
					{#if signupPendingEmail}
						<h2 class="text-lg font-semibold text-foreground">Check your e-mail</h2>
						<p class="mt-3 text-sm text-muted-foreground">
							We sent a confirmation link to <span class="text-foreground"
								>{signupPendingEmail}</span
							>. Open it to activate your account, then sign in.
						</p>
						<ScButton class="mt-6 w-full justify-center" onclick={backToSignIn}>
							Back to sign in
						</ScButton>
					{:else}
						<form
							onsubmit={(e) => {
								e.preventDefault();
								signUpNewUser();
							}}
							class="space-y-4">
							<ScInput
								id="register-email"
								label="E-mail"
								{labelClass}
								type="email"
								bind:value={emailRegister}
								placeholder="you@example.com"
								autocomplete="email"
								required
								icon={F.mail} />

							<div class="space-y-1.5">
								<ScInput
									id="register-username"
									label="Username"
									{labelClass}
									type="text"
									bind:value={usernameRegister}
									autocomplete="username"
									aria-describedby="register-username-hint"
									minlength={3}
									maxlength={30}
									required
									icon={F.person} />
								<p id="register-username-hint" class="text-xs text-muted-foreground">
									Shown on your reviews and, if you sell, your shop page.
								</p>
							</div>

							<PasswordField
								id="register-password"
								label="Password"
								bind:value={passwordRegister}
								autocomplete="new-password"
								hint={PASSWORD_RULES_TEXT}
								required />

							{#if errorShow === 2}
								{@render errorBox()}
							{/if}

							<ScButton type="submit" class="w-full justify-center" disabled={isAuthLoading}>
								{isAuthLoading ? 'Creating account…' : 'Create account'}
							</ScButton>

							<p class="text-center text-xs text-muted-foreground">
								By creating an account you agree to our
								<a
									href={resolve('/policy')}
									class="underline underline-offset-4 hover:text-foreground">Terms</a>
								and
								<a
									href={resolve('/policy')}
									class="underline underline-offset-4 hover:text-foreground">Privacy Policy</a
								>.
							</p>

							{@render divider()}
							{@render googleButton(true)}
						</form>
					{/if}
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</DotGrid>
