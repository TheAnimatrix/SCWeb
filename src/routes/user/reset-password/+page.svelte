<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { confirmPasswordReset } from '$lib/client/authApi';
	import { validatePasswordResetConfirm } from '$lib/client/authValidation';
	import { DotGrid, ScButton, ScInput } from '$lib/components/sc';
	import { ScLogo } from '$lib/components/shell';
	import { F } from '$lib/icons/fluent';
	import { theme } from '$lib/client/theme';

	const tokenHash = $derived($page.url.searchParams.get('token_hash') ?? '');

	let password = $state('');
	let confirmPassword = $state('');
	let isLoading = $state(false);
	let errorText = $state('');
	let success = $state(false);

	async function handleSubmit() {
		if (isLoading) return;

		const validationError = validatePasswordResetConfirm({
			tokenHash,
			password,
			confirmPassword
		});
		if (validationError) {
			errorText = validationError;
			return;
		}

		isLoading = true;
		errorText = '';

		const result = await confirmPasswordReset(fetch, {
			tokenHash,
			password
		});

		isLoading = false;

		if (!result.ok) {
			errorText = result.error.message;
			return;
		}

		success = true;
	}
</script>

<DotGrid class="relative min-h-screen overflow-hidden">
	<div class="relative z-10 mx-auto flex max-w-md flex-col px-4 py-10">
		<a href="/" class="mb-8 inline-flex self-center">
			<ScLogo variant={$theme === 'light' ? 'light' : 'dark'} />
		</a>

		<div class="rounded-md border border-border bg-card p-6">
			<h1 class="text-xl font-semibold text-foreground">Reset password</h1>

			{#if success}
				<p class="mt-4 text-sm text-muted-foreground" role="status">
					Your password has been updated. You can sign in with your new password.
				</p>
				<ScButton class="mt-6 w-full justify-center" onclick={() => goto('/user/sign')}>
					Go to sign in
				</ScButton>
			{:else if !tokenHash}
				<p class="mt-4 text-sm text-destructive" role="alert">
					This reset link is invalid or has expired. Request a new one from the sign-in page.
				</p>
				<ScButton class="mt-6 w-full justify-center" href="/user/forgot-password">
					Request new link
				</ScButton>
			{:else}
				<p class="mt-2 text-sm text-muted-foreground">Choose a new password for your account.</p>

				<form
					class="mt-6 space-y-4"
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}>
					<ScInput
						id="reset-password"
						label="new password"
						type="password"
						bind:value={password}
						autocomplete="new-password"
						required
						icon={F.lock} />

					<ScInput
						id="reset-password-confirm"
						label="confirm password"
						type="password"
						bind:value={confirmPassword}
						autocomplete="new-password"
						required
						icon={F.lock} />

					{#if errorText}
						<p class="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
							{errorText}
						</p>
					{/if}

					<ScButton type="submit" class="w-full justify-center" disabled={isLoading}>
						{isLoading ? 'Updating…' : 'Update password'}
					</ScButton>
				</form>
			{/if}
		</div>
	</div>
</DotGrid>
