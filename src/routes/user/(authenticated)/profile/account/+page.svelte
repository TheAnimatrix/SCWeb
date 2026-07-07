<script lang="ts">
	import { goto } from '$app/navigation';
	import { validatePassword } from '$lib/types/helper.js';
	import { setLoading } from '$lib/client/loading.js';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { ScButton, TierBadge } from '$lib/components/sc';
	import { Button } from '$lib/components/ui/button';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';

	let { data } = $props();
	let supabase_lt = data.supabase_lt;

	let username = $state('');
	let email = $derived(data.email ?? '');
	let tier = $derived(data.tier ?? '');

	$effect(() => {
		username = data.username ?? '';
	});

	let newPass = $state('');
	let confirmPass = $state('');
	let load_store = getContext<Writable<boolean>>('loading');
	let error_msg = $state<string | undefined>();
	let isUpdatingPassword = $state(false);
	let isEditingUsername = $state(false);
	let newUsername = $state('');
	let isUpdatingUsername = $state(false);
	let username_error = $state<string | undefined>();

	const inputClass =
		'h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/10';

	const labelClass = 'font-mono text-xs text-muted-foreground';

	async function changePassword() {
		if (isUpdatingPassword) return;
		isUpdatingPassword = true;

		const k = validatePassword(newPass, confirmPass);
		if (k.error) {
			error_msg = k.msg;
			isUpdatingPassword = false;
			return;
		}
		error_msg = undefined;

		setLoading(load_store, true);
		try {
			await supabase_lt.auth.updateUser({ password: newPass });
			newPass = '';
			confirmPass = '';
		} catch {
			error_msg = 'Failed to update password.';
		} finally {
			setLoading(load_store, false);
			isUpdatingPassword = false;
		}
	}

	async function logout() {
		await supabase_lt.auth.signOut({ scope: 'global' });
		goto('/user/sign', { replaceState: true });
	}

	function validateUsername(value: string): { error: boolean; msg?: string } {
		if (!value || value.length < 3 || value.length > 20) {
			return { error: true, msg: '3–20 characters' };
		}
		if (!/^\w+$/.test(value)) {
			return { error: true, msg: 'Letters, numbers, underscores only' };
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
			username_error = 'User not found.';
			isUpdatingUsername = false;
			return;
		}

		setLoading(load_store, true);
		try {
			const { data: taken } = await supabase_lt.rpc('check_username', {
				desired_username: newUsername
			});
			if (taken) {
				username_error = 'Username not available';
				return;
			}
			const { error } = await supabase_lt
				.from('users')
				.update({ username: newUsername })
				.eq('id', data.user.id);
			if (error) {
				username_error = error.message || 'Failed to update.';
			} else {
				username = newUsername;
				isEditingUsername = false;
				username_error = undefined;
			}
		} catch {
			username_error = 'Failed to update username.';
		} finally {
			setLoading(load_store, false);
			isUpdatingUsername = false;
		}
	}
</script>

<div class="space-y-4">
	<section class="rounded-md border border-border bg-card p-4">
		<dl class="space-y-3">
			<div>
				<dt class={labelClass}>username</dt>
				<dd class="mt-1">
					{#if isEditingUsername}
						<div class="flex items-center gap-2">
							<input
								type="text"
								bind:value={newUsername}
								maxlength="20"
								class="{inputClass} flex-1"
							/>
							<Button
								variant="outline"
								size="icon"
								class="size-9 shrink-0"
								onclick={saveUsername}
								disabled={isUpdatingUsername || newUsername === username}
								aria-label="Save username"
							>
								<Check class="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="size-9 shrink-0"
								onclick={cancelEditUsername}
								aria-label="Cancel"
							>
								<X class="size-4" />
							</Button>
						</div>
						{#if username_error}
							<p class="mt-1 text-xs text-destructive" role="alert">{username_error}</p>
						{/if}
					{:else}
						<div class="flex items-center justify-between gap-2">
							<span class="text-sm">
								<span class="text-muted-foreground">/crafts/</span>{username}
							</span>
							<Button
								variant="ghost"
								size="icon"
								class="size-8 shrink-0"
								onclick={startEditUsername}
								aria-label="Edit username"
							>
								<Pencil class="size-3.5" />
							</Button>
						</div>
					{/if}
				</dd>
			</div>

			<div>
				<dt class={labelClass}>email</dt>
				<dd class="mt-1 text-sm">{email}</dd>
			</div>

			<div>
				<dt class={labelClass}>tier</dt>
				<dd class="mt-1">
					{#if tier}
						<TierBadge {tier} />
					{/if}
				</dd>
			</div>
		</dl>
	</section>

	<section class="rounded-md border border-border bg-card p-4">
		<p class={labelClass}>password</p>

		{#if error_msg}
			<p class="mt-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
				{error_msg}
			</p>
		{/if}

		<div class="mt-3 space-y-3">
			<input
				type="password"
				bind:value={newPass}
				placeholder="New password"
				class={inputClass}
			/>
			<input
				type="password"
				bind:value={confirmPass}
				placeholder="Confirm password"
				class={inputClass}
			/>
			<ScButton
				class="w-full justify-center"
				variant="secondary"
				onclick={changePassword}
				disabled={isUpdatingPassword || !newPass}
			>
				Update password
			</ScButton>
		</div>
	</section>

	<Button
		variant="outline"
		class="w-full font-mono text-xs text-destructive hover:text-destructive"
		onclick={logout}
	>
		Sign out
	</Button>
</div>
