<script lang="ts">
	import { goto } from '$app/navigation';
	import { requestPasswordReset } from '$lib/client/authApi';
	import { validatePasswordResetRequest } from '$lib/client/authValidation';
	import { DotGrid, ScButton, ScInput } from '$lib/components/sc';
	import { ScLogo } from '$lib/components/shell';
	import { F } from '$lib/icons/fluent';
	import { theme } from '$lib/client/theme';

	let email = $state('');
	let isLoading = $state(false);
	let submitted = $state(false);
	let errorText = $state('');

	async function handleSubmit() {
		if (isLoading) return;

		const validationError = validatePasswordResetRequest(email);
		if (validationError) {
			errorText = validationError;
			return;
		}

		isLoading = true;
		errorText = '';

		const result = await requestPasswordReset(fetch, email);
		isLoading = false;

		if (!result.ok) {
			errorText = result.error.message;
			return;
		}

		submitted = true;
	}
</script>

<DotGrid class="relative min-h-screen overflow-hidden">
	<div class="relative z-10 mx-auto flex max-w-md flex-col px-4 py-10">
		<a href="/" class="mb-8 inline-flex self-center">
			<ScLogo variant={$theme === 'light' ? 'light' : 'dark'} />
		</a>

		<div class="rounded-md border border-border bg-card p-6">
			<h1 class="text-xl font-semibold text-foreground">Forgot password</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				Enter your email and we will send reset instructions if an account exists.
			</p>

			{#if submitted}
				<p class="mt-6 rounded-md border border-border bg-background px-3 py-3 text-sm text-foreground" role="status">
					If an account exists for that email, we sent password reset instructions. Check your inbox.
				</p>
				<div class="mt-6 flex flex-col gap-3">
					<ScButton class="w-full justify-center" href="/user/sign">Back to sign in</ScButton>
				</div>
			{:else}
				<form
					class="mt-6 space-y-4"
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}>
					<ScInput
						id="forgot-email"
						label="email"
						type="email"
						bind:value={email}
						placeholder="you@example.com"
						autocomplete="email"
						required
						icon={F.mail} />

					{#if errorText}
						<p class="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
							{errorText}
						</p>
					{/if}

					<ScButton type="submit" class="w-full justify-center" disabled={isLoading}>
						{isLoading ? 'Sending…' : 'Send reset link'}
					</ScButton>
				</form>

				<p class="mt-4 text-center text-sm text-muted-foreground">
					<a href="/user/sign" class="text-foreground underline-offset-4 hover:underline">Back to sign in</a>
				</p>
			{/if}
		</div>
	</div>
</DotGrid>
