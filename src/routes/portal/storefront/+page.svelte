<script lang="ts">
	import { resolve } from '$app/paths';
	import { beforeNavigate, invalidateAll } from '$app/navigation';
	import { updateMyStorefront, uploadMakerAsset } from '$lib/client/makersApi';
	import { ScButton, ScInput } from '$lib/components/sc';
	import { SeoHead } from '$lib/components/seo';
	import { makerStorefrontPath } from '$lib/utils/reservedUsernames';

	let { data } = $props();

	const BIO_MAX = 2000;
	const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
	const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
	const IMAGE_HINT = 'JPG, PNG, WebP or GIF, up to 5 MB.';

	type Fields = {
		displayName: string;
		tagline: string;
		bio: string;
		location: string;
		bannerUrl: string;
		avatarUrl: string;
		storefrontState: string;
	};

	function fieldsFromMaker(): Fields {
		const maker = data.maker as typeof data.maker & {
			tagline?: string | null;
			bio?: string | null;
			location?: string | null;
			banner_url?: string | null;
			avatar_url?: string | null;
		};
		return {
			displayName: maker.display_name ?? '',
			tagline: maker.tagline ?? '',
			bio: maker.bio ?? '',
			location: maker.location ?? '',
			bannerUrl: maker.banner_url ?? '',
			avatarUrl: maker.avatar_url ?? '',
			storefrontState: maker.storefront_state ?? 'draft'
		};
	}

	const initial = fieldsFromMaker();
	let saved = $state<Fields>({ ...initial });
	let displayName = $state(initial.displayName);
	let tagline = $state(initial.tagline);
	let bio = $state(initial.bio);
	let location = $state(initial.location);
	let bannerUrl = $state(initial.bannerUrl);
	let avatarUrl = $state(initial.avatarUrl);
	let storefrontState = $state(initial.storefrontState);
	let busy = $state(false);
	let uploadBusy = $state<'banner' | 'avatar' | null>(null);
	let notice = $state('');
	let error = $state('');
	let bannerInput = $state<HTMLInputElement | null>(null);
	let avatarInput = $state<HTMLInputElement | null>(null);

	const shopHref = $derived(data.maker.username ? makerStorefrontPath(data.maker.username) : null);
	const dirty = $derived(
		displayName !== saved.displayName ||
			tagline !== saved.tagline ||
			bio !== saved.bio ||
			location !== saved.location ||
			bannerUrl !== saved.bannerUrl ||
			avatarUrl !== saved.avatarUrl ||
			storefrontState !== saved.storefrontState
	);

	beforeNavigate((navigation) => {
		if (!dirty || busy) return;
		if (navigation.type === 'leave') {
			// Browser shows its own "leave site?" prompt.
			navigation.cancel();
			return;
		}
		if (!confirm('You have unsaved changes on your shop page. Leave without saving?')) {
			navigation.cancel();
		}
	});

	async function save(e: Event) {
		e.preventDefault();
		error = '';
		notice = '';
		if (!displayName.trim()) {
			error = 'Display name is required.';
			return;
		}
		busy = true;
		const state =
			storefrontState === 'live' || storefrontState === 'paused' || storefrontState === 'draft'
				? storefrontState
				: 'draft';
		const result = await updateMyStorefront(fetch, {
			display_name: displayName.trim(),
			tagline: tagline.trim() || null,
			bio: bio.trim() || null,
			location: location.trim() || null,
			banner_url: bannerUrl || null,
			avatar_url: avatarUrl || null,
			storefront_state: state
		});
		busy = false;
		if (!result.ok) {
			error = result.error.message;
			return;
		}
		saved = {
			displayName,
			tagline,
			bio,
			location,
			bannerUrl,
			avatarUrl,
			storefrontState: state
		};
		notice = 'Shop page saved.';
		await invalidateAll();
	}

	async function upload(purpose: 'banner' | 'avatar', e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		error = '';
		notice = '';
		if (!IMAGE_TYPES.includes(file.type)) {
			error = 'Use a JPG, PNG, WebP or GIF image.';
			return;
		}
		if (file.size > MAX_IMAGE_BYTES) {
			error = 'Image must be 5 MB or smaller.';
			return;
		}
		uploadBusy = purpose;
		const result = await uploadMakerAsset(fetch, file, purpose);
		uploadBusy = null;
		if (!result.ok) {
			error = result.error.message;
			return;
		}
		if (purpose === 'banner') bannerUrl = result.data.url;
		else avatarUrl = result.data.url;
	}
</script>

<SeoHead meta={{ title: 'Shop page · Maker portal', noindex: true }} />

<section class="mx-auto max-w-xl space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Shop page</h2>
		{#if shopHref}
			<p class="mt-1 text-sm text-muted-foreground">
				This is your public shop at
				{#if saved.storefrontState === 'live'}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- dynamic shop path -->
					<a href={shopHref} class="underline">{shopHref}</a>.
				{:else}
					<span class="font-mono">{shopHref}</span> (visible once it is live).
				{/if}
				The address comes from your username.
			</p>
		{:else}
			<p class="mt-1 text-sm text-muted-foreground">
				Your shop address comes from your username.
				<a href={resolve('/user/profile/account')} class="underline"
					>Set a username in Account settings</a>
				first.
			</p>
		{/if}
	</div>

	<form class="space-y-5" onsubmit={save}>
		<div class="space-y-1.5">
			<label for="shop-name" class="block text-sm font-medium">Display name</label>
			<ScInput id="shop-name" bind:value={displayName} required maxlength={100} />
		</div>
		<div class="space-y-1.5">
			<label for="shop-tagline" class="block text-sm font-medium">Tagline</label>
			<ScInput id="shop-tagline" bind:value={tagline} maxlength={160} />
		</div>
		<div class="space-y-1.5">
			<label for="shop-bio" class="block text-sm font-medium">Bio</label>
			<textarea
				id="shop-bio"
				bind:value={bio}
				rows={5}
				maxlength={BIO_MAX}
				aria-describedby="shop-bio-count"
				class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"></textarea>
			<p id="shop-bio-count" class="text-xs text-muted-foreground">{bio.length}/{BIO_MAX}</p>
		</div>
		<div class="space-y-1.5">
			<label for="shop-location" class="block text-sm font-medium">Location</label>
			<ScInput id="shop-location" bind:value={location} maxlength={100} />
		</div>

		<div class="space-y-2">
			<p class="text-sm font-medium" id="shop-banner-label">Banner</p>
			{#if bannerUrl}
				<img
					src={bannerUrl}
					alt="Current banner"
					class="h-28 w-full rounded-md border border-border object-cover" />
			{/if}
			<div class="flex flex-wrap items-center gap-3">
				<ScButton
					variant="secondary"
					disabled={uploadBusy !== null}
					onclick={() => bannerInput?.click()}>
					{uploadBusy === 'banner' ? 'Uploading…' : bannerUrl ? 'Replace banner' : 'Upload banner'}
				</ScButton>
				{#if bannerUrl}
					<ScButton variant="ghost" onclick={() => (bannerUrl = '')}>Remove banner</ScButton>
				{/if}
			</div>
			<input
				bind:this={bannerInput}
				type="file"
				accept={IMAGE_TYPES.join(',')}
				class="hidden"
				tabindex="-1"
				aria-labelledby="shop-banner-label"
				onchange={(e) => upload('banner', e)} />
			<p class="text-xs text-muted-foreground">
				{IMAGE_HINT} A wide image works best, about 1500 × 400.
			</p>
		</div>

		<div class="space-y-2">
			<p class="text-sm font-medium" id="shop-avatar-label">Profile picture</p>
			{#if avatarUrl}
				<img
					src={avatarUrl}
					alt="Current profile"
					class="size-20 rounded-full border border-border object-cover" />
			{/if}
			<div class="flex flex-wrap items-center gap-3">
				<ScButton
					variant="secondary"
					disabled={uploadBusy !== null}
					onclick={() => avatarInput?.click()}>
					{uploadBusy === 'avatar'
						? 'Uploading…'
						: avatarUrl
							? 'Replace picture'
							: 'Upload picture'}
				</ScButton>
				{#if avatarUrl}
					<ScButton variant="ghost" onclick={() => (avatarUrl = '')}>Remove picture</ScButton>
				{/if}
			</div>
			<input
				bind:this={avatarInput}
				type="file"
				accept={IMAGE_TYPES.join(',')}
				class="hidden"
				tabindex="-1"
				aria-labelledby="shop-avatar-label"
				onchange={(e) => upload('avatar', e)} />
			<p class="text-xs text-muted-foreground">{IMAGE_HINT} A square image works best.</p>
		</div>

		<div class="space-y-1.5">
			<label for="shop-visibility" class="block text-sm font-medium">Visibility</label>
			<select
				id="shop-visibility"
				bind:value={storefrontState}
				aria-describedby="shop-visibility-help"
				class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
				<option value="draft">Draft</option>
				<option value="live">Live</option>
				<option value="paused">Paused</option>
			</select>
			<p id="shop-visibility-help" class="text-xs text-muted-foreground">
				Draft and Paused hide your shop page. Your live listings still appear in Crafts.
			</p>
		</div>

		{#if error}
			<p class="text-sm text-destructive" role="alert">{error}</p>
		{/if}
		{#if notice && !dirty}
			<p class="text-sm text-muted-foreground" role="status">{notice}</p>
		{/if}
		<div class="flex flex-wrap items-center gap-3">
			<ScButton type="submit" disabled={busy || uploadBusy !== null}
				>{busy ? 'Saving…' : 'Save shop page'}</ScButton>
			{#if dirty}
				<p class="text-sm text-muted-foreground" role="status">
					Unsaved changes. Uploaded images are kept only after you save.
				</p>
			{/if}
		</div>
	</form>
</section>
