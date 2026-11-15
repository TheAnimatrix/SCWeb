<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { DotGrid, ScButton, SearchBar } from '$lib/components/sc';
	import { SeoHead } from '$lib/components/seo';

	const status = $derived(page.status);
	const isNotFound = $derived(status === 404);
	const isServerError = $derived(status >= 500);

	const heading = $derived(
		isNotFound
			? "We can't find that page."
			: isServerError
				? 'Something broke on our side.'
				: "That didn't work."
	);
	const detail = $derived(
		isNotFound
			? 'The listing may have sold out or been removed.'
			: isServerError
				? 'Try again in a minute.'
				: (page.error?.message ?? 'Go back and try again.')
	);

	function handleSearch(query: string) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- static path with a query string
		void goto(query ? `/crafts?q=${encodeURIComponent(query)}` : '/crafts');
	}

	function retry() {
		location.reload();
	}
</script>

<SeoHead meta={{ title: isNotFound ? 'Page not found' : 'Something went wrong', noindex: true }} />

<DotGrid class="relative overflow-hidden border-b border-border">
	<div
		class="relative z-10 mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-6 px-4 py-16">
		<p class="font-mono text-sm text-muted-foreground">Error {status}</p>
		<div class="space-y-3">
			<h1 class="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{heading}</h1>
			<p class="text-base text-muted-foreground">{detail}</p>
		</div>

		{#if isNotFound}
			<SearchBar onsearch={handleSearch} placeholder="Search the shop" class="w-full" />
		{/if}

		<div class="flex flex-wrap items-center gap-3">
			{#if isServerError}
				<ScButton onclick={retry}>Try again</ScButton>
				<ScButton href="/" variant="secondary">Go home</ScButton>
			{:else}
				<ScButton href="/crafts" arrow>Browse the shop</ScButton>
				<ScButton href="/" variant="secondary">Go home</ScButton>
			{/if}
		</div>

		<p class="text-sm text-muted-foreground">
			Need help? Email
			<a
				href="mailto:support@selfcrafted.in"
				class="text-foreground underline underline-offset-2 hover:decoration-2">
				support@selfcrafted.in
			</a>
		</p>
	</div>
</DotGrid>
