<script lang="ts">
	import Icon from '@iconify/svelte';
	import { Breadcrumbs } from '$lib/components/shell';
	import { PortalSectionLabel } from '$lib/components/portal';
	import { DotGrid, ScButton, TagBadge, TierBadge } from '$lib/components/sc';
	import DriftParticles from '$lib/components/effects/DriftParticles.svelte';

	const craftingSteps = [
		{
			title: 'Prototype',
			description:
				'Build your hardware, document the design, and open-source it under the right license. We help you validate before you invest in inventory.'
		},
		{
			title: 'Connect',
			description:
				'Share your project on Discord or reach out via email. Get feedback from other makers, find collaborators, and plug into the community before you list.'
		},
		{
			title: 'Launch',
			description:
				'Get listed on the marketplace. We handle quality checks, storefront setup, and fulfillment logistics so your product reaches buyers.'
		},
		{
			title: 'Scale',
			description:
				'As demand grows, draw on manufacturing, compliance, sourcing, and marketing support within the network — scaling sustainably without starting over.'
		}
	];

	const platformFeatures = [
		{
			title: 'Maker marketplace',
			description:
				'A storefront and discovery layer built for indie hardware — so makers can sell to buyers who care about where things come from.'
		},
		{
			title: 'Local sourcing',
			description:
				'Connect with component makers and fabricators in your city. Build supply chains rooted in the communities you already work in.'
		},
		{
			title: 'Creator community',
			description:
				'A network of indie creators sharing knowledge, parts, and demand — strengthening the ecosystem where you are, not somewhere else.'
		}
	];

	const scaleupServices = [
		'Manufacturing',
		'Enclosures',
		'Compliance',
		'Sourcing',
		'Software',
		'Debug tooling',
		'Research',
		'Marketing'
	];

	const missionTags = [
		'local_ecosystem',
		'maker_infrastructure',
		'small_batch',
		'community_sourcing',
		'sustainable_growth',
		'creator_support'
	];

	const crafterTiers = [
		{
			name: 'Bee',
			level: 'starter',
			desc: 'First steps in the maker economy, onboarding support.'
		},
		{
			name: 'Peacock',
			level: 'emerging',
			desc: 'Promising talent, mentorship access, growth resources.'
		},
		{
			name: 'Rhino',
			level: 'skilled',
			desc: 'Growing reputation, community spotlight, verified badge.'
		},
		{
			name: 'Tiger',
			level: 'established',
			desc: 'Proven track record, featured collections, priority support.'
		},
		{
			name: 'Osprey',
			level: 'master',
			desc: 'Exceptional reputation, premium visibility, dedicated support.'
		}
	];
</script>

<div class="min-h-screen bg-background text-foreground">
	<DotGrid class="relative overflow-hidden border-b border-border">
		<DriftParticles particleCount={42} accentChance={0.2} />

		<div class="relative z-10 mx-auto max-w-7xl px-4 py-8 md:py-12">
			<Breadcrumbs items={[{ label: 'home', href: '/' }, { label: 'Start crafting' }]} />

			<div class="mt-8 max-w-2xl space-y-4">
				<h1 class="text-balance text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
					Turn your creation into a product.
				</h1>
				<p class="max-w-prose text-base leading-relaxed text-muted-foreground">
					Shared infrastructure for makers building in the open — locally, sustainably, together.
				</p>
			</div>

			<div class="mt-8">
				<ScButton
					href="https://discord.gg/UQ74TQfMqM"
					target="_blank"
					rel="noopener noreferrer"
					variant="discord"
				>
					<Icon icon="ph:discord-logo-bold" class="text-lg" />
					Join Discord
				</ScButton>
			</div>
		</div>
	</DotGrid>

	<section class="border-b border-border">
		<div class="mx-auto max-w-7xl px-4 py-12 md:py-16">
			<PortalSectionLabel label="why_we_exist" />

			<div class="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-16">
				<div class="space-y-5">
					<h2 class="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
						Building where makers actually are.
					</h2>

					<div class="max-w-prose space-y-4 text-base leading-relaxed text-muted-foreground">
						<p>
							SelfCrafted exists to grow the maker ecosystem where it already lives — in cities,
							workshops, and small-batch shops. Not by replacing it with another generic marketplace,
							but by giving it the infrastructure to thrive.
						</p>
						<p>
							We connect storefronts, local sourcing, fulfillment, and community into one shared
							layer — so indie hardware can grow sustainably, rooted in the places and people that
							build it.
						</p>
						<p>
							The goal isn't a quick flip. It's a healthier ecosystem: makers finding each other,
							shipping reliably, and scaling without losing what makes their work local and real.
						</p>
					</div>
				</div>

				<aside class="space-y-3 lg:pt-1">
					<p class="font-mono text-xs uppercase tracking-wide text-muted-foreground">// focus_areas</p>
					<div class="flex flex-wrap gap-2">
						{#each missionTags as tag (tag)}
							<TagBadge label={tag} />
						{/each}
					</div>
				</aside>
			</div>
		</div>
	</section>

	<section class="border-b border-border bg-muted/20">
		<div class="mx-auto max-w-7xl px-4 py-12 md:py-16">
			<PortalSectionLabel label="your_path" />

			<div class="mt-4 max-w-2xl">
				<h2 class="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
					From prototype to product in four steps.
				</h2>
				<p class="mt-3 text-base leading-relaxed text-muted-foreground">
					How a single craft moves from workshop to marketplace — and back into the ecosystem.
				</p>
			</div>

			<ol class="mt-10 space-y-0 border border-border bg-card">
				{#each craftingSteps as step, i (step.title)}
					<li
						class="grid gap-4 border-b border-border px-5 py-6 last:border-b-0 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-6 sm:px-6"
					>
						<span
							class="font-mono text-2xl font-medium tabular-nums text-muted-foreground/60"
							aria-hidden="true"
						>
							{String(i + 1).padStart(2, '0')}
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
			<PortalSectionLabel label="platform" />

			<div class="mt-4 max-w-2xl">
				<h2 class="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
					Infrastructure that grows with you.
				</h2>
				<p class="mt-3 text-base leading-relaxed text-muted-foreground">
					The tools to list, sell, and source locally — with room to grow when your craft finds its
					audience.
				</p>
			</div>

			<div class="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-12">
				<div class="space-y-6">
					<p class="font-mono text-xs uppercase tracking-wide text-muted-foreground">
						// core_platform
					</p>
					<dl class="divide-y divide-border border border-border bg-card">
						{#each platformFeatures as feature (feature.title)}
							<div class="space-y-1 px-5 py-4">
								<dt class="text-sm font-medium text-foreground">{feature.title}</dt>
								<dd class="text-sm leading-relaxed text-muted-foreground">{feature.description}</dd>
							</div>
						{/each}
					</dl>
				</div>

				<div class="space-y-6">
					<p class="font-mono text-xs uppercase tracking-wide text-muted-foreground">
						// scale_up_services
					</p>
					<div class="border border-border bg-card p-5">
						<p class="text-sm leading-relaxed text-muted-foreground">
							<span class="font-medium text-foreground">5% platform fee</span>
							— scaling services available as you grow. Fees for hands-on assistance vary by product
							complexity.
						</p>

						<div class="mt-5 flex flex-wrap gap-2">
							{#each scaleupServices as service (service)}
								<TagBadge label={service} />
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="border-b border-border bg-muted/20">
		<div class="mx-auto max-w-7xl px-4 py-12 md:py-16">
			<PortalSectionLabel label="crafter_tiers" />

			<div class="mt-4 max-w-2xl">
				<h2 class="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
					Level up as you ship.
				</h2>
				<p class="mt-3 text-base leading-relaxed text-muted-foreground">
					Reputation grows with contribution — visibility and support unlock as you ship and stay
					active in the ecosystem.
				</p>
			</div>

			<div class="mt-10 overflow-x-auto border border-border bg-card">
				<table class="w-full min-w-[36rem] text-left text-sm">
					<thead>
						<tr class="border-b border-border bg-muted/40 font-mono text-xs uppercase tracking-wide text-muted-foreground">
							<th class="px-5 py-3 font-normal" scope="col">tier</th>
							<th class="px-5 py-3 font-normal" scope="col">level</th>
							<th class="px-5 py-3 font-normal" scope="col">benefits</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each crafterTiers as tier (tier.name)}
							<tr>
								<td class="px-5 py-4">
									<TierBadge tier={tier.name} />
								</td>
								<td class="px-5 py-4">
									<TagBadge label={tier.level} />
								</td>
								<td class="px-5 py-4 leading-relaxed text-muted-foreground">{tier.desc}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</section>

	<section>
		<div
			class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between md:py-16"
		>
			<div class="max-w-md space-y-2">
				<p class="font-mono text-xs uppercase tracking-wide text-muted-foreground">// next_step</p>
				<p class="text-base font-medium text-foreground">Ready to grow the ecosystem with us?</p>
				<p class="text-sm leading-relaxed text-muted-foreground">
					Share your craft on Discord — we'll help you plug into the network.
				</p>
			</div>

			<div class="flex flex-wrap gap-3">
				<ScButton
					href="https://discord.gg/UQ74TQfMqM"
					target="_blank"
					rel="noopener noreferrer"
					variant="discord"
				>
					Join Discord
				</ScButton>
				<ScButton href="/crafts" variant="secondary" arrow>Browse crafts</ScButton>
			</div>
		</div>
	</section>
</div>
