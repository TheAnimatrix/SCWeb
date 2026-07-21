<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { updateMyStorefront, uploadMakerAsset } from '$lib/client/makersApi';
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
	let uploadBusy = $state<'banner' | 'avatar' | null>(null);
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
			storefront_state:
				storefrontState === 'live' || storefrontState === 'paused' || storefrontState === 'draft'
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

	async function upload(purpose: 'banner' | 'avatar', e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		uploadBusy = purpose;
		message = '';
		const result = await uploadMakerAsset(fetch, file, purpose);
		uploadBusy = null;
		if (!result.ok) {
			message = result.error.message;
			return;
		}
		if (purpose === 'banner') bannerUrl = result.data.url;
		else avatarUrl = result.data.url;
	}

	function clearBanner() {
		bannerUrl = '';
	}

	function clearAvatar() {
		avatarUrl = '';
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

		<div class="space-y-2">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Banner</span>
			{#if bannerUrl}
				<img src={bannerUrl} alt="" class="h-28 w-full rounded-md border border-border object-cover" />
				<div class="flex gap-2">
					<ScButton type="button" variant="ghost" onclick={clearBanner}>Remove</ScButton>
				</div>
			{/if}
			<label class="inline-flex cursor-pointer items-center text-sm">
				<span
					class="rounded-md border border-border px-3 py-1.5 {uploadBusy === 'banner'
						? 'opacity-60'
						: 'hover:bg-muted'}">
					{uploadBusy === 'banner' ? 'Uploading…' : 'Upload banner'}
				</span>
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp,image/gif"
					class="hidden"
					disabled={uploadBusy !== null}
					onchange={(e) => upload('banner', e)} />
			</label>
		</div>

		<div class="space-y-2">
			<span class="font-mono text-[10px] uppercase text-muted-foreground">Avatar</span>
			{#if avatarUrl}
				<img
					src={avatarUrl}
					alt=""
					class="size-20 rounded-full border border-border object-cover" />
				<div class="flex gap-2">
					<ScButton type="button" variant="ghost" onclick={clearAvatar}>Remove</ScButton>
				</div>
			{/if}
			<label class="inline-flex cursor-pointer items-center text-sm">
				<span
					class="rounded-md border border-border px-3 py-1.5 {uploadBusy === 'avatar'
						? 'opacity-60'
						: 'hover:bg-muted'}">
					{uploadBusy === 'avatar' ? 'Uploading…' : 'Upload avatar'}
				</span>
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp,image/gif"
					class="hidden"
					disabled={uploadBusy !== null}
					onchange={(e) => upload('avatar', e)} />
			</label>
		</div>

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
