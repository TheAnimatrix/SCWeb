<script lang="ts">
	import { F } from '$lib/icons/fluent';

	import Icon from '@iconify/svelte';
	import { Breadcrumbs } from '$lib/components/shell';
	import { DotGrid, ScButton, TierBadge } from '$lib/components/sc';
	import DriftParticles from '$lib/components/effects/DriftParticles.svelte';
	import { SeoHead } from '$lib/components/seo';
	import { craftingSeo } from '$lib/seo/meta';
	import { absoluteUrl } from '$lib/seo/site';
	import { page } from '$app/state';

	const DISCORD_URL = 'https://discord.gg/UQ74TQfMqM';

	const sellingSteps = [
		{
			title: 'Apply',
			description:
				'Tell us what you make and whether you want to sell products, take 3D printing jobs, or both. It is one short form.'
		},
		{
			title: 'We read it',
			description:
				'A person on our team reads every application. You can check the result on the same page you applied from.'
		},
		{
			title: 'Set up your shop',
			description:
				'Once you are approved you get the maker portal. Add a banner, a photo and a few lines about yourself, then switch your shop page to live.'
		},
		{
			title: 'Add your listings',
			description:
				'Each listing has photos, a price and a stock count. We look at every listing before it goes live. If you later change its name, price or photos, we look at it again.'
		}
	];

	const listingTypes = [
		{
			title: 'Products',
			description: 'Finished hardware and kits you make: boards, tools, probes, enclosures.'
		},
		{
			title: 'Spares',
			description: 'Replacement parts for things people already own.'
		},
		{
			title: 'Flea market',
			description: 'Surplus and used parts from your bench that someone else can put to work.'
		},
		{
			title: '3D printing jobs',
			description:
				'If you own a printer, list the filament you have in stock. Buyers send you a model, you quote a price, and you print it once they pay.'
		}
	];

	const quickFacts = [
		{ term: 'Platform fee', detail: '5%' },
		{ term: 'Ships to', detail: 'India only' },
		{ term: 'Site code', detail: 'Open source (AGPL-3.0)' }
	];

	const makerTiers = [
		{ names: ['Bee'], description: 'Where every maker starts.' },
		{
			names: ['Peacock', 'Rhino', 'Tiger'],
			description: 'The steps up from there, as a maker builds a track record on the site.'
		},
		{ names: ['Osprey'], description: 'Selfcrafted Original. Products we make ourselves.' }
	];
</script>

<SeoHead meta={{ ...craftingSeo, canonical: absoluteUrl('/crafting', page.url.origin) }} />

<div class="min-h-screen bg-background text-foreground">
	<DotGrid class="relative overflow-hidden border-b border-border">
		<DriftParticles particleCount={42} accentChance={0.2} />

		<div class="relative z-10 mx-auto max-w-7xl px-4 py-8 md:py-12">
			<Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Sell' }]} />

			<div class="mt-8 max-w-2xl space-y-4">
				<h1 class="text-balance text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
					Sell what you build.
				</h1>
				<p class="max-w-prose text-base leading-relaxed text-muted-foreground">
					List your hardware on Selfcrafted. We review your application, you set up a shop page, and
					buyers across India can order from you.
				</p>
			</div>

			<div class="mt-8 flex flex-wrap gap-3">
				<ScButton href="/maker/apply?source=crafting">Apply as maker</ScButton>
				<ScButton href={DISCORD_URL} target="_blank" rel="noopener noreferrer" variant="discord">
					<Icon icon={F.brandDiscord} class="text-lg" />
					Join Discord
				</ScButton>
			</div>
		</div>
	</DotGrid>

	<section class="border-b border-border">
		<div class="mx-auto max-w-7xl px-4 py-12 md:py-16">
			<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-16">
				<div class="space-y-5">
					<h2 class="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
						Why we built this
					</h2>

					<div class="max-w-prose space-y-4 text-base leading-relaxed text-muted-foreground">
						<p>
							Selfcrafted started out of frustration. If you make hardware in India, parts get held
							up in customs, import rules change without warning, and good tools made here are hard
							to find.
						</p>
						<p>
							We make hardware ourselves, so we built the shop we wanted: a place where makers here
							can sell what they build, and where the rest of us can buy it without importing it.
							Our own products are listed on it next to everyone else's.
						</p>
						<p>If you make hardware in India, we'd like you on it.</p>
					</div>
				</div>

				<aside class="lg:pt-1">
					<dl class="divide-y divide-border border border-border bg-card text-sm">
						{#each quickFacts as fact (fact.term)}
							<div class="flex items-baseline justify-between gap-4 px-5 py-3">
								<dt class="text-muted-foreground">{fact.term}</dt>
								<dd class="text-right font-medium text-foreground">{fact.detail}</dd>
							</div>
						{/each}
					</dl>
				</aside>
			</div>
		</div>
	</section>

	<section class="border-b border-border bg-muted/20">
		<div class="mx-auto max-w-7xl px-4 py-12 md:py-16">
			<h2 class="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
				How selling here works
			</h2>

			<ol class="mt-8 space-y-0 border border-border bg-card">
				{#each sellingSteps as step, i (step.title)}
					<li
						class="grid gap-4 border-b border-border px-5 py-6 last:border-b-0 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-6 sm:px-6">
						<span
							class="font-mono text-2xl font-medium tabular-nums text-muted-foreground"
							aria-hidden="true">
							{i + 1}
						</span>
						<div class="space-y-1.5">
							<h3 class="text-base font-medium text-foreground">{step.title}</h3>
							<p class="max-w-prose text-sm leading-relaxed text-muted-foreground">
								{step.description}
							</p>
						</div>
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<section class="border-b border-border">
		<div class="mx-auto max-w-7xl px-4 py-12 md:py-16">
			<div class="grid gap-10 lg:grid-cols-2 lg:gap-12">
				<div>
					<h2 class="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
						What you can sell
					</h2>
					<dl class="mt-8 divide-y divide-border border border-border bg-card">
						{#each listingTypes as type (type.title)}
							<div class="space-y-1 px-5 py-4">
								<dt class="text-sm font-medium text-foreground">{type.title}</dt>
								<dd class="text-sm leading-relaxed text-muted-foreground">{type.description}</dd>
							</div>
						{/each}
					</dl>
				</div>

				<div>
					<h2 class="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
						What it costs
					</h2>
					<div
						class="mt-8 space-y-4 border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
						<p>
							<span class="font-medium text-foreground">We charge a 5% platform fee.</span>
						</p>
						<p>
							If you need a hand with something bigger, like an enclosure, sourcing a part or
							getting a design ready to manufacture, ask us on Discord. That kind of help is priced
							separately and depends on the product.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="border-b border-border bg-muted/20">
		<div class="mx-auto max-w-7xl px-4 py-12 md:py-16">
			<div class="max-w-2xl">
				<h2 class="text-balance text-2xl font-semibold tracking-tight md:text-3xl">Maker tiers</h2>
				<p class="mt-3 text-base leading-relaxed text-muted-foreground">
					Your tier shows as a badge next to your name on every listing. We set tiers by hand.
				</p>
			</div>

			<dl class="mt-8 divide-y divide-border border border-border bg-card">
				{#each makerTiers as tier (tier.names[0])}
					<div class="grid gap-2 px-5 py-4 sm:grid-cols-[16rem_minmax(0,1fr)] sm:items-center">
						<dt class="flex flex-wrap gap-2">
							{#each tier.names as name (name)}
								<TierBadge tier={name} />
							{/each}
						</dt>
						<dd class="text-sm leading-relaxed text-muted-foreground">{tier.description}</dd>
					</div>
				{/each}
			</dl>
		</div>
	</section>

	<section>
		<div
			class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between md:py-16">
			<div class="max-w-md space-y-2">
				<p class="text-base font-medium text-foreground">Got something to sell?</p>
				<p class="text-sm leading-relaxed text-muted-foreground">
					Apply here. If you have questions first, ask on Discord.
				</p>
			</div>

			<div class="flex flex-wrap gap-3">
				<ScButton href="/maker/apply?source=crafting" arrow>Apply as maker</ScButton>
				<ScButton href={DISCORD_URL} target="_blank" rel="noopener noreferrer" variant="discord">
					Join Discord
				</ScButton>
			</div>
		</div>
	</section>
</div>
