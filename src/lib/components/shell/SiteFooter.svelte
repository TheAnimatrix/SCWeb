<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import AvarnicLogo from '$lib/svg/avarnic-logo.svg';
	import { cn } from '$lib/utils';
	import ScLogo from './ScLogo.svelte';
	import PwaInstallButton from './PwaInstallButton.svelte';
	import { theme } from '$lib/client/theme';

	let { githubStars = null }: { githubStars?: number | null } = $props();
	interface FooterLink {
		label: string;
		href: string;
		external?: boolean;
	}

	interface FooterColumn {
		title: string;
		links: FooterLink[];
	}

	const columns: FooterColumn[] = [
		{
			title: '/explore',
			links: [
				{ label: 'crafts', href: '/crafts' },
				{ label: '3dp_portal', href: '/3dp-portal' },
				{ label: 'Start crafting', href: '/crafting' }
			]
		},
		{
			title: '/community',
			links: [
				{
					label: 'discord',
					href: 'https://discord.gg/UQ74TQfMqM',
					external: true
				},
				{
					label: 'github',
					href: 'https://github.com/TheAnimatrix/SCWeb',
					external: true
				}
			]
		},
		{
			title: '/legal',
			links: [
				{ label: 'privacy', href: '/policy#privacy' },
				{ label: 'shipping', href: '/policy#shipping' },
				{ label: 'refunds', href: '/policy#cancellation' }
			]
		}
	];
	const logoVariant = $derived($theme === 'light' ? 'light' : 'dark');
</script>

<footer class="border-t border-border bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-4 py-8 md:py-12">
		<div class="grid grid-cols-2 gap-x-6 gap-y-6 md:gap-10 lg:grid-cols-4">
			<div class="col-span-2 space-y-2 lg:col-span-1 lg:space-y-4">
				<a href="/" class="inline-block">
					<ScLogo variant={logoVariant} />
				</a>
				<p class="max-w-xs font-mono text-xs leading-snug text-muted-foreground md:leading-relaxed">
					open-source marketplace infra for indie hardware.
					<a
						href="https://github.com/TheAnimatrix/SCWeb"
						target="_blank"
						rel="noopener noreferrer"
						class="text-foreground underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground">
						fork us on github.
					</a>
				</p>
				{#if githubStars !== null}
					<a
						href="https://github.com/TheAnimatrix/SCWeb"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
						aria-label="{githubStars} GitHub stars on SCWeb">
						<Icon icon={F.star} class="size-3 fill-current" aria-hidden="true" />
						<span>{githubStars} {githubStars === 1 ? 'star' : 'stars'}</span>
					</a>
				{/if}
			</div>

			{#each columns as column (column.title)}
				<div>
					<h3 class="mb-2 font-mono text-xs text-muted-foreground md:mb-4">{column.title}</h3>
					<ul class="space-y-1 md:space-y-2">
						{#each column.links as link (link.href)}
							<li>
								<a
									href={link.href}
									class="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
									{...link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}}>
									{link.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div
			class="mt-6 flex flex-col gap-3 border-t border-border pt-4 font-mono text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:mt-12 md:pt-6">
			<p>© 2026 selfcrafted_india</p>
			<PwaInstallButton />
			<a
				href="https://avarnic.com"
				target="_blank"
				rel="noopener noreferrer"
				class="group inline-flex items-center gap-1.5 transition-colors hover:text-foreground sm:ml-auto"
				aria-label="Designed by avarnic">
				<span>designed by</span>
				<img
					src={AvarnicLogo}
					alt=""
					class={cn(
						'h-3.5 w-auto brightness-0 transition-opacity group-hover:opacity-80',
						logoVariant === 'light' ? 'opacity-[0.45]' : 'invert opacity-55'
					)}
					aria-hidden="true" />
			</a>
		</div>
	</div>
</footer>
