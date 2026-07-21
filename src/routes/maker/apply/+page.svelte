<script lang="ts">
	import { goto } from '$app/navigation';
	import { applyAsMaker } from '$lib/client/makersApi';
	import { SeoHead } from '$lib/components/seo';
	import { ScButton, ScInput } from '$lib/components/sc';
	import { Breadcrumbs } from '$lib/components/shell';

	let { data } = $props();

	let displayName = $state('');
	let bio = $state('');
	let city = $state('');
	let physicalGoods = $state(true);
	let printing3d = $state(false);
	let submitting = $state(false);
	let error = $state('');
	let success = $state(false);

	const alreadyApproved = $derived(data.maker?.approved_state === 'approved');
	const alreadyPending = $derived(data.maker?.approved_state === 'pending');
	const defaultDisplayName = $derived(
		typeof data.maker?.display_name === 'string' ? data.maker.display_name : ''
	);

	async function submit(e: Event) {
		e.preventDefault();
		error = '';
		submitting = true;
		const capabilities: string[] = [];
		if (physicalGoods) capabilities.push('physical_goods');
		if (printing3d) capabilities.push('printing_3d');
		if (capabilities.length === 0) {
			error = 'Select at least one capability.';
			submitting = false;
			return;
		}

		const result = await applyAsMaker(fetch, {
			display_name: displayName || defaultDisplayName,
			bio: bio || undefined,
			city: city || undefined,
			capabilities
		});
		submitting = false;
		if (!result.ok) {
			error = result.error.message;
			return;
		}
		success = true;
	}
</script>

<SeoHead
	meta={{
		title: 'Apply as Maker',
		description: 'Apply to sell products or offer 3D printing on Selfcrafted.',
		noindex: true
	}} />

<div class="mx-auto max-w-2xl px-4 py-8">
	<Breadcrumbs
		items={[
			{ label: 'home', href: '/' },
			{ label: 'crafting', href: '/crafting' },
			{ label: 'apply' }
		]} />

	<h1 class="mt-6 text-3xl font-semibold tracking-tight">Become a maker</h1>
	<p class="mt-2 text-muted-foreground">
		Tell us what you make. We’ll review your application and unlock the maker portal.
	</p>

	{#if alreadyApproved}
		<div class="mt-8 rounded-md border border-border bg-muted/30 p-4">
			<p class="text-sm">You’re already an approved maker.</p>
			<a href="/portal" class="mt-3 inline-block text-sm underline">Open portal</a>
		</div>
	{:else if alreadyPending || success}
		<div class="mt-8 rounded-md border border-border bg-muted/30 p-4">
			<p class="text-sm">Your application is pending review. We’ll email you when it’s decided.</p>
			<a href="/user/profile/account" class="mt-3 inline-block text-sm underline"
				>Back to profile</a
			>
		</div>
	{:else}
		<form class="mt-8 space-y-5" onsubmit={submit}>
			<label class="block space-y-1.5">
				<span class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
					>Display name</span
				>
				<ScInput
					bind:value={displayName}
					required={!defaultDisplayName}
					maxlength={100}
					placeholder={defaultDisplayName || 'Your shop name'} />
			</label>
			<label class="block space-y-1.5">
				<span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bio</span>
				<textarea
					bind:value={bio}
					maxlength={500}
					rows={4}
					class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
					placeholder="What do you make?"></textarea>
			</label>
			<label class="block space-y-1.5">
				<span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">City</span>
				<ScInput bind:value={city} maxlength={100} placeholder="City" />
			</label>

			<fieldset class="space-y-2">
				<legend class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
					>Capabilities</legend
				>
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={physicalGoods} />
					Physical goods marketplace
				</label>
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={printing3d} />
					On-demand 3D printing
				</label>
			</fieldset>

			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}

			<div class="flex gap-3">
				<ScButton type="submit" disabled={submitting}>
					{submitting ? 'Submitting…' : 'Submit application'}
				</ScButton>
				<button
					type="button"
					class="text-sm text-muted-foreground underline"
					onclick={() => goto('/crafting')}>
					Cancel
				</button>
			</div>
		</form>
	{/if}
</div>
