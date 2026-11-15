<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { applyAsMaker } from '$lib/client/makersApi';
	import { SeoHead } from '$lib/components/seo';
	import { ScButton, ScInput } from '$lib/components/sc';
	import { Breadcrumbs } from '$lib/components/shell';
	import { formatDate } from '$lib/utils/format';

	let { data } = $props();

	let displayName = $state('');
	let bio = $state('');
	let city = $state('');
	let links = $state('');
	let physicalGoods = $state(true);
	let printing3d = $state(false);
	let submitting = $state(false);
	let error = $state('');
	let submittedAt = $state<string | null>(null);
	let reapplying = $state(false);

	const alreadyApproved = $derived(data.maker?.approved_state === 'approved');
	const alreadyPending = $derived(data.maker?.approved_state === 'pending');
	const wasRejected = $derived(
		data.maker?.approved_state === 'rejected' || data.latestApplication?.status === 'rejected'
	);
	const pendingSince = $derived(
		submittedAt ??
			(data.latestApplication?.status === 'pending' ? data.latestApplication.created_at : null)
	);
	const rejectionNote = $derived(data.latestApplication?.review_notes?.trim() || '');
	const defaultDisplayName = $derived(
		typeof data.maker?.display_name === 'string' ? data.maker.display_name : ''
	);

	async function submit(e: Event) {
		e.preventDefault();
		error = '';
		const capabilities: string[] = [];
		if (physicalGoods) capabilities.push('physical_goods');
		if (printing3d) capabilities.push('printing_3d');
		if (capabilities.length === 0) {
			error = 'Choose at least one thing you want to do on Selfcrafted.';
			return;
		}
		const name = (displayName || defaultDisplayName).trim();
		if (name.length < 3) {
			error = 'Display name must be at least 3 characters.';
			return;
		}

		submitting = true;
		const result = await applyAsMaker(fetch, {
			display_name: name,
			bio: bio.trim() || undefined,
			city: city.trim() || undefined,
			links: links.trim() || undefined,
			capabilities
		});
		submitting = false;
		if (!result.ok) {
			error = result.error.message;
			return;
		}
		submittedAt = new Date().toISOString();
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
			<p class="text-sm">You're already an approved maker.</p>
			<a href={resolve('/portal')} class="mt-3 inline-block text-sm underline"
				>Open the maker portal</a>
		</div>
	{:else if submittedAt || (alreadyPending && !wasRejected)}
		<div class="mt-8 rounded-md border border-border bg-muted/30 p-4" role="status">
			<p class="text-sm">
				We've got your application. We read every one by hand. Check back here for the result.
			</p>
			{#if pendingSince}
				<p class="mt-2 text-sm text-muted-foreground">Submitted on {formatDate(pendingSince)}.</p>
			{/if}
			<a href={resolve('/user/profile/account')} class="mt-3 inline-block text-sm underline"
				>Back to your profile</a>
		</div>
	{:else if wasRejected && !reapplying}
		<div class="mt-8 rounded-md border border-border bg-muted/30 p-4">
			<p class="text-sm font-medium">Your application was not approved.</p>
			{#if data.latestApplication?.reviewed_at}
				<p class="mt-1 text-sm text-muted-foreground">
					Reviewed on {formatDate(data.latestApplication.reviewed_at)}.
				</p>
			{/if}
			{#if rejectionNote}
				<div class="mt-3">
					<p class="text-sm text-muted-foreground">Note from the reviewer:</p>
					<p class="mt-1 whitespace-pre-line text-sm">{rejectionNote}</p>
				</div>
			{/if}
			<ScButton class="mt-4" onclick={() => (reapplying = true)}>Apply again</ScButton>
		</div>
	{:else}
		<form class="mt-8 space-y-5" onsubmit={submit}>
			<div class="space-y-1.5">
				<label for="apply-display-name" class="block text-sm font-medium">Display name</label>
				<ScInput
					id="apply-display-name"
					bind:value={displayName}
					required={!defaultDisplayName}
					minlength={3}
					maxlength={100}
					aria-describedby="apply-display-name-help"
					placeholder={defaultDisplayName || 'Your shop name'} />
				<p id="apply-display-name-help" class="text-xs text-muted-foreground">
					Buyers see this as your shop name. At least 3 characters.
				</p>
			</div>
			<div class="space-y-1.5">
				<label for="apply-bio" class="block text-sm font-medium">What do you make?</label>
				<textarea
					id="apply-bio"
					bind:value={bio}
					maxlength={500}
					rows={4}
					class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
					aria-describedby="apply-bio-help"></textarea>
				<p id="apply-bio-help" class="text-xs text-muted-foreground">
					A few lines about your work. {bio.length}/500
				</p>
			</div>
			<div class="space-y-1.5">
				<label for="apply-links" class="block text-sm font-medium"
					>Links to your work (optional)</label>
				<ScInput
					id="apply-links"
					bind:value={links}
					maxlength={500}
					aria-describedby="apply-links-help"
					placeholder="https://" />
				<p id="apply-links-help" class="text-xs text-muted-foreground">
					Your shop, GitHub, Instagram or anything that shows what you make. Separate links with
					commas.
				</p>
			</div>
			<div class="space-y-1.5">
				<label for="apply-city" class="block text-sm font-medium">City</label>
				<ScInput id="apply-city" bind:value={city} maxlength={100} />
			</div>

			<fieldset class="space-y-2">
				<legend class="text-sm font-medium">What do you want to do on Selfcrafted?</legend>
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={physicalGoods} />
					Sell products in my shop
				</label>
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={printing3d} />
					Offer 3D printing on request
				</label>
			</fieldset>

			{#if error}
				<p class="text-sm text-destructive" role="alert">{error}</p>
			{/if}

			<div class="flex gap-3">
				<ScButton type="submit" disabled={submitting}>
					{submitting ? 'Submitting…' : 'Submit application'}
				</ScButton>
				<button
					type="button"
					class="text-sm text-muted-foreground underline"
					onclick={() => goto(resolve('/crafting'))}>
					Cancel
				</button>
			</div>
		</form>
	{/if}
</div>
