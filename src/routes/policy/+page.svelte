<script lang="ts">
	import { browser } from '$app/environment';
	import snarkdown from 'snarkdown';
	import { ABOUT_STRINGS } from '$lib/constants/strings';
	import { Breadcrumbs } from '$lib/components/shell';

	const sections = [
		{ id: 'privacy', label: 'privacy', title: 'Privacy Policy', content: ABOUT_STRINGS.privacy },
		{ id: 'terms', label: 'terms', title: 'Terms & Conditions', content: ABOUT_STRINGS.terms },
		{
			id: 'cancellation',
			label: 'refunds',
			title: 'Cancellation & Refund',
			content: ABOUT_STRINGS.cancellation
		},
		{
			id: 'shipping',
			label: 'shipping',
			title: 'Shipping & Delivery',
			content: ABOUT_STRINGS.shipping
		},
		{ id: 'contact', label: 'contact', title: 'Contact Us', content: ABOUT_STRINGS.contact },
		{ id: 'risks', label: 'risks', title: 'Risks', content: ABOUT_STRINGS.risks }
	] as const;

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

		const syncHeight = () => {
			if (!isPinned) navHeight = navEl.offsetHeight;
		};

		syncHeight();
		const observer = new ResizeObserver(syncHeight);
		observer.observe(navEl);
		return () => observer.disconnect();
	});
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-3xl px-4 py-6 md:py-8">
		<Breadcrumbs items={[{ label: 'home', href: '/' }, { label: 'legal' }]} />

		<header class="mt-4">
			<p class="font-mono text-xs uppercase tracking-wide text-muted-foreground">// legal</p>
			<h1 class="mt-1 text-2xl font-semibold tracking-tight">Policies</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Terms, privacy, shipping, refunds, and contact.
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
							class="whitespace-nowrap border-b-2 px-2.5 py-2 font-mono text-xs uppercase tracking-wide transition-colors
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

		<div class="mt-6 space-y-8">
			{#each sections as section (section.id)}
				<section id={section.id} class="policy-section">
					<h2 class="text-sm font-semibold tracking-tight">{section.title}</h2>
					<div class="policy-prose mt-2 text-sm leading-relaxed text-muted-foreground">
						{@html snarkdown(section.content)}
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

	:global(.policy-prose p),
	:global(.policy-prose ul),
	:global(.policy-prose ol) {
		margin-bottom: 0.75em;
	}

	:global(.policy-prose p:last-child),
	:global(.policy-prose ul:last-child),
	:global(.policy-prose ol:last-child) {
		margin-bottom: 0;
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
		font-size: 0.875rem;
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
