<script lang="ts">
	import { browser } from '$app/environment';
	import snarkdown from 'snarkdown';
	import { ABOUT_STRINGS } from '$lib/constants/strings';
	import { Breadcrumbs } from '$lib/components/shell';
	import { SeoHead } from '$lib/components/seo';
	import { policySeo } from '$lib/seo/meta';
	import { absoluteUrl } from '$lib/seo/site';
	import { page } from '$app/state';

	const sections = [
		{
			id: 'shipping',
			label: 'Shipping',
			title: 'Shipping and delivery',
			content: ABOUT_STRINGS.shipping
		},
		{
			id: 'cancellation',
			label: 'Refunds',
			title: 'Cancellation and refunds',
			content: ABOUT_STRINGS.cancellation
		},
		{
			id: 'buyer-protection',
			label: 'Buyer protection',
			title: 'Who is responsible for your order',
			content: ABOUT_STRINGS.risks
		},
		{ id: 'privacy', label: 'Privacy', title: 'Privacy', content: ABOUT_STRINGS.privacy },
		{ id: 'terms', label: 'Terms', title: 'Terms of use', content: ABOUT_STRINGS.terms },
		{ id: 'contact', label: 'Contact', title: 'Contact', content: ABOUT_STRINGS.contact }
	] as const;

	/** snarkdown doesn't emit paragraphs, so render each blank-line-separated block on its own. */
	function blocks(markdown: string): string[] {
		return markdown
			.trim()
			.split(/\n{2,}/)
			.filter((block) => block.trim().length > 0);
	}

	let activeSection = $state(0);
	let navAnchor = $state<HTMLElement | null>(null);
	let navEl = $state<HTMLElement | null>(null);
	let navHeight = $state(0);
	let isPinned = $state(false);

	function getTopbarHeight() {
		if (!browser) return 84;
		const value = getComputedStyle(document.documentElement)
			.getPropertyValue('--site-topbar-height')
			.trim();
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 84;
	}

	function updatePinState() {
		if (!navAnchor) return;

		const topbarHeight = getTopbarHeight();
		const anchorTop = navAnchor.getBoundingClientRect().top;

		if (!isPinned && anchorTop <= topbarHeight) {
			if (navEl) navHeight = navEl.offsetHeight;
			isPinned = true;
		} else if (isPinned && anchorTop > topbarHeight + 8) {
			isPinned = false;
		}
	}

	function scrollToSection(index: number) {
		activeSection = index;
		document.getElementById(sections[index].id)?.scrollIntoView({ behavior: 'smooth' });
	}

	$effect(() => {
		if (!browser || !navAnchor) return;

		updatePinState();
		window.addEventListener('scroll', updatePinState, { passive: true });
		window.addEventListener('resize', updatePinState, { passive: true });
		return () => {
			window.removeEventListener('scroll', updatePinState);
			window.removeEventListener('resize', updatePinState);
		};
	});

	$effect(() => {
		if (!browser || !navEl) return;

		const el = navEl;
		const syncHeight = () => {
			if (!isPinned) navHeight = el.offsetHeight;
		};

		syncHeight();
		const observer = new ResizeObserver(syncHeight);
		observer.observe(el);
		return () => observer.disconnect();
	});
</script>

<SeoHead meta={{ ...policySeo, canonical: absoluteUrl('/policy', page.url.origin) }} />

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-3xl px-4 py-6 md:py-8">
		<Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Policies' }]} />

		<header class="mt-4">
			<h1 class="text-2xl font-semibold tracking-tight">Policies</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Shipping, refunds, privacy, terms and how to reach us. Last updated 15 November 2026.
			</p>
		</header>

		<div
			bind:this={navAnchor}
			class="mt-4"
			style:height={isPinned && navHeight > 0 ? `${navHeight}px` : undefined}>
			<nav
				bind:this={navEl}
				aria-label="Policy sections"
				class="policy-tabs border-b border-border bg-background {isPinned
					? 'policy-tabs--pinned'
					: '-mx-4'}">
				<div class="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4">
					{#each sections as section, i (section.id)}
						<button
							type="button"
							class="whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors
								{activeSection === i
								? 'border-foreground text-foreground'
								: 'border-transparent text-muted-foreground hover:text-foreground'}"
							onclick={() => scrollToSection(i)}>
							{section.label}
						</button>
					{/each}
				</div>
			</nav>
		</div>

		<div class="mt-8 space-y-12">
			{#each sections as section (section.id)}
				<section id={section.id} class="policy-section">
					<h2 class="text-lg font-semibold tracking-tight">{section.title}</h2>
					<div class="policy-prose mt-3 max-w-[65ch] text-base leading-relaxed text-foreground/80">
						{#each blocks(section.content) as block, i (i)}
							<div class="policy-block">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -- snarkdown on trusted static policy markdown -->
								{@html snarkdown(block)}
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	</div>
</div>

<style>
	.policy-tabs--pinned {
		position: fixed;
		inset-inline: 0;
		top: calc(var(--site-topbar-height, 5.25rem) - 1px);
		z-index: 30;
		box-shadow: 0 -1px 0 0 hsl(var(--background));
	}

	.policy-tabs {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.policy-tabs :global(> div) {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.policy-tabs::-webkit-scrollbar,
	.policy-tabs :global(> div)::-webkit-scrollbar {
		display: none;
	}

	.policy-section {
		scroll-margin-top: calc(var(--site-topbar-height, 5.25rem) + 2.75rem);
	}

	:global(.policy-block) {
		margin-bottom: 0.85em;
	}

	:global(.policy-block:last-child) {
		margin-bottom: 0;
	}

	/* A bold line on its own is a question or sub-heading: give it room above. */
	:global(.policy-block > strong:only-child) {
		display: block;
		margin-top: 1.5em;
	}

	:global(.policy-block:first-child > strong:only-child) {
		margin-top: 0;
	}

	:global(.policy-prose h2),
	:global(.policy-prose h3),
	:global(.policy-prose h4),
	:global(.policy-prose strong) {
		color: hsl(var(--foreground));
		font-weight: 600;
	}

	:global(.policy-prose h2),
	:global(.policy-prose h3),
	:global(.policy-prose h4) {
		margin-top: 1em;
		margin-bottom: 0.5em;
		font-size: 1rem;
	}

	:global(.policy-prose ul) {
		list-style: disc;
		padding-left: 1.25em;
	}

	:global(.policy-prose li) {
		margin-bottom: 0.4em;
	}

	:global(.policy-prose a) {
		color: hsl(var(--foreground));
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	:global(.policy-prose a:hover) {
		text-decoration-thickness: 2px;
	}
</style>
