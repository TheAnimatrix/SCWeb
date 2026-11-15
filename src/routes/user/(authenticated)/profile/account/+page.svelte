<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { navigating, page } from '$app/state';
	import { PASSWORD_RULES_TEXT, validatePassword } from '$lib/types/helper.js';
	import { FormSectionSkeleton, ScButton, ScInput, TierBadge } from '$lib/components/sc';
	import { Button } from '$lib/components/ui/button';
	import {
		checkUsernameAvailable,
		friendlySupabaseAuthError,
		USERNAME_TAKEN_MESSAGE
	} from '$lib/client/authApi';
	import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';
	import { makerStorefrontPath } from '$lib/utils/reservedUsernames';
	import PasswordField from '../../../PasswordField.svelte';

	let { data } = $props();
	const supabase = requireBrowserSupabase(data.supabase);

	let usernameOverride = $state<string | null>(null);
	const username = $derived(usernameOverride ?? data.username ?? '');
	let email = $derived(data.email ?? '');
	let tier = $derived(data.tier ?? '');
	const isApprovedMaker = $derived(data.maker?.approved_state === 'approved');
	const hasMakerRecord = $derived(Boolean(data.maker?.approved_state));

	$effect(() => {
		void data.username;
		usernameOverride = null;
	});

	let newPass = $state('');
	let confirmPass = $state('');
	let error_msg = $state<string | undefined>();
	let password_success = $state<string | undefined>();
	let isUpdatingPassword = $state(false);
	let isEditingUsername = $state(false);
	let newUsername = $state('');
	let isUpdatingUsername = $state(false);
	let username_error = $state<string | undefined>();

	const isPageLoading = $derived(
		page.url.pathname.startsWith('/user/profile/account') && !!navigating.to
	);

	const labelClass = 'text-sm text-muted-foreground';

	async function changePassword() {
		if (isUpdatingPassword) return;
		isUpdatingPassword = true;
		password_success = undefined;

		const k = validatePassword(newPass, confirmPass);
		if (k.error) {
			error_msg = k.msg;
			isUpdatingPassword = false;
			return;
		}
		error_msg = undefined;

		try {
			// updateUser reports failures in `error`; it does not throw.
			const { error } = await supabase.auth.updateUser({ password: newPass });
			if (error) {
				error_msg = friendlySupabaseAuthError(error);
				return;
			}
			newPass = '';
			confirmPass = '';
			password_success = 'Password updated.';
		} catch (err) {
			error_msg = friendlySupabaseAuthError(err instanceof Error ? { message: err.message } : null);
		} finally {
			isUpdatingPassword = false;
		}
	}

	async function logout() {
		const { error } = await supabase.auth.signOut();
		if (error) {
			error_msg = "We couldn't sign you out. Try again.";
		}
	}

	function validateUsername(value: string): { error: boolean; msg?: string } {
		if (!/^[a-zA-Z0-9_]{3,30}$/.test(value)) {
			return { error: true, msg: 'Usernames are 3 to 30 letters, numbers or underscores.' };
		}
		return { error: false };
	}

	function startEditUsername() {
		newUsername = username;
		error_msg = undefined;
		username_error = undefined;
		isEditingUsername = true;
	}

	function cancelEditUsername() {
		isEditingUsername = false;
		username_error = undefined;
	}

	async function saveUsername() {
		if (isUpdatingUsername) return;
		isUpdatingUsername = true;

		const v = validateUsername(newUsername);
		if (v.error) {
			username_error = v.msg;
			isUpdatingUsername = false;
			return;
		}
		if (!data.user?.id) {
			username_error = 'Your session has expired. Sign in again and retry.';
			isUpdatingUsername = false;
			return;
		}

		try {
			const usernameCheck = await checkUsernameAvailable(fetch, newUsername);
			if (!usernameCheck.ok) {
				username_error = usernameCheck.error.message;
				return;
			}
			if (!usernameCheck.data.available) {
				username_error = USERNAME_TAKEN_MESSAGE;
				return;
			}
			const { error } = await supabase
				.from('users')
				.update({ username: newUsername })
				.eq('id', data.user.id);
			if (error) {
				username_error =
					error.code === '23505'
						? USERNAME_TAKEN_MESSAGE
						: "We couldn't save your username. Try again in a moment.";
			} else {
				usernameOverride = newUsername;
				isEditingUsername = false;
				username_error = undefined;
			}
		} catch {
			username_error = "We couldn't save your username. Try again in a moment.";
		} finally {
			isUpdatingUsername = false;
		}
	}
</script>

<div class="space-y-4">
	{#if isPageLoading}
		<FormSectionSkeleton />
	{:else}
		<section class="rounded-md border border-border bg-card p-4">
			<dl class="space-y-3">
				<div>
					<dt class={labelClass}>
						{#if isEditingUsername}
							<label for="account-username">Username</label>
						{:else}
							Username
						{/if}
					</dt>
					<dd class="mt-1">
						{#if isEditingUsername}
							<div class="flex items-center gap-2">
								<ScInput
									id="account-username"
									type="text"
									bind:value={newUsername}
									maxlength={30}
									autocomplete="username"
									size="sm"
									class="flex-1" />
								<Button
									variant="outline"
									size="icon"
									class="size-9 shrink-0"
									onclick={saveUsername}
									disabled={isUpdatingUsername || newUsername === username}
									aria-label="Save username">
									<Icon icon={F.check} class="size-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="size-9 shrink-0"
									onclick={cancelEditUsername}
									aria-label="Cancel">
									<Icon icon={F.dismiss} class="size-4" />
								</Button>
							</div>
							{#if username_error}
								<p class="mt-1 text-xs text-destructive" role="alert">{username_error}</p>
							{/if}
						{:else}
							<div class="flex items-center justify-between gap-2">
								<span class="text-sm">
									@{username}
									{#if isApprovedMaker && username}
										<!-- eslint-disable svelte/no-navigation-without-resolve -- dynamic storefront path -->
										<a
											href={makerStorefrontPath(username)}
											class="ml-2 text-muted-foreground underline underline-offset-4 hover:text-foreground"
											>View your shop page</a>
										<!-- eslint-enable svelte/no-navigation-without-resolve -->
									{/if}
								</span>
								<Button
									variant="ghost"
									size="icon"
									class="size-8 shrink-0"
									onclick={startEditUsername}
									aria-label="Edit username">
									<Icon icon={F.edit} class="size-3.5" />
								</Button>
							</div>
						{/if}
					</dd>
				</div>

				<div>
					<dt class={labelClass}>E-mail</dt>
					<dd class="mt-1 text-sm">{email}</dd>
				</div>

				{#if tier}
					<div>
						<dt class={labelClass}>Tier</dt>
						<dd class="mt-1">
							<TierBadge {tier} />
							<p class="mt-1 text-xs text-muted-foreground">
								Tiers show how established a maker is. Everyone starts as Bee.
							</p>
						</dd>
					</div>
				{/if}
			</dl>
		</section>

		{#if !hasMakerRecord}
			<section class="rounded-md border border-border bg-card p-4 text-sm">
				<p>Sell products or offer printing on Selfcrafted.</p>
				<a
					href="{resolve('/maker/apply')}?source=profile"
					class="mt-2 inline-block underline underline-offset-4">Apply to become a maker</a>
			</section>
		{/if}

		<section class="rounded-md border border-border bg-card p-4">
			<h2 class="text-sm font-medium">Change password</h2>

			{#if error_msg}
				<p
					class="mt-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
					role="alert">
					{error_msg}
				</p>
			{/if}
			{#if password_success}
				<p class="mt-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm" role="status">
					{password_success}
				</p>
			{/if}

			<form
				class="mt-3 space-y-3"
				onsubmit={(e) => {
					e.preventDefault();
					changePassword();
				}}>
				<PasswordField
					id="account-new-password"
					label="New password"
					bind:value={newPass}
					autocomplete="new-password"
					hint={PASSWORD_RULES_TEXT}
					size="sm" />
				<PasswordField
					id="account-confirm-password"
					label="Confirm new password"
					bind:value={confirmPass}
					autocomplete="new-password"
					size="sm" />
				<ScButton
					type="submit"
					class="w-full justify-center"
					variant="secondary"
					disabled={isUpdatingPassword || !newPass}>
					{isUpdatingPassword ? 'Updating…' : 'Update password'}
				</ScButton>
			</form>
		</section>

		<Button
			variant="outline"
			class="w-full text-destructive hover:text-destructive"
			onclick={logout}>
			Sign out
		</Button>
	{/if}
</div>
