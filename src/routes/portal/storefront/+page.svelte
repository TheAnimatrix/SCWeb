<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { updateMyStorefront } from '$lib/client/makersApi';
	import { ScButton, ScInput } from '$lib/components/sc';
	import { SeoHead } from '$lib/components/seo';

	let { data } = $props();

	let displayName = $state(data.maker.display_name ?? '');
	let tagline = $state((data.maker as { tagline?: string | null }).tagline ?? '');
	let bio = $state((data.maker as { bio?: string | null }).bio ?? '');
	let location = $state((data.maker as { location?: string | null }).location ?? '');
	let bannerUrl = $state((data.maker as { banner_url?: string | null }).banner_url ?? '');
	let avatarUrl = $state((data.maker as { avatar_url?: string | null }).avatar_url ?? '');
	let storefrontState = $state(data.maker.storefront_state ?? 'draft');
	let busy = $state(false);
	let message = $state('');

	async function save(e: Event) {
		e.preventDefault();
		busy = true;
		message = '';
		const result = await updateMyStorefront(fetch, {
			display_name: displayName || null,
			tagline: tagline || null,
			bio: bio || null,
			location: location || null,
			banner_url: bannerUrl || null,
			avatar_url: avatarUrl || null,
			storefront_state: storefrontState === 'live' || storefrontState === 'paused' || storefrontState === 'draft'
				? storefrontState
				: 'draft'
		});
		busy = false;
		if (!result.ok) {
			message = result.error.message;
			return;
		}
		message = 'Storefront saved.';
		await invalidateAll();
	}
</script>

<SeoHead meta={{ title: 'Storefront · Portal', noindex: true }} />

<section class="mx-auto max-w-xl space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Storefront editor</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Personalize your public page at /maker/@{data.maker.username}. Handle comes from your
			username.
		</p>
	</div>

	<form class="space-y-4" onsubmit={save}>
		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Display name</span>
			<ScInput bind:value={displayName} />
		</label>
		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Tagline</span>
			<ScInput bind:value={tagline} maxlength={160} />
		</label>
		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Bio</span>
			<textarea
				bind:value={bio}
				rows={5}
				class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"></textarea>
		</label>
		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Location</span>
			<ScInput bind:value={location} />
		</label>
		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Banner URL</span>
			<ScInput bind:value={bannerUrl} type="url" placeholder="https://" />
		</label>
		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Avatar URL</span>
			<ScInput bind:value={avatarUrl} type="url" placeholder="https://" />
		</label>
		<label class="block space-y-1">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Visibility</span>
			<select
				bind:value={storefrontState}
				class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
				<option value="draft">Draft</option>
				<option value="live">Live</option>
				<option value="paused">Paused</option>
			</select>
		</label>
		{#if message}
			<p class="text-sm text-muted-foreground">{message}</p>
		{/if}
		<ScButton type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save storefront'}</ScButton>
	</form>
</section>
