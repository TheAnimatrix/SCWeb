<script lang="ts">
	import AvarnicLogo from '$lib/svg/avarnic-logo.svg';
	import { cn } from '$lib/utils';
	import ScLogo from './ScLogo.svelte';
	import PwaInstallButton from './PwaInstallButton.svelte';
	import { theme } from '$lib/client/theme';

	interface FooterLink {
		label: string;
		href: string;
		external?: boolean;
	}

	interface FooterColumn {
		title: string;
		links: FooterLink[];
	}

	const SUPPORT_EMAIL = 'support@selfcrafted.in';
	const WHATSAPP_DISPLAY = '+91 86374 52606';
	const WHATSAPP_HREF = 'https://wa.me/918637452606';

	const columns: FooterColumn[] = [
		{
			title: 'Explore',
			links: [
				{ label: 'Shop', href: '/crafts' },
				{ label: 'Blog', href: '/blog' },
				{ label: '3D printing', href: '/3dp-portal' },
				{ label: 'Sell', href: '/crafting' }
			]
		},
		{
			title: 'Community',
			links: [
				{
					label: 'Discord',
					href: 'https://discord.gg/UQ74TQfMqM',
					external: true
				},
				{
					label: 'GitHub',
					href: 'https://github.com/TheAnimatrix/SCWeb',
					external: true
				}
			]
		},
		{
			title: 'Policies',
			links: [
				{ label: 'Terms', href: '/policy#terms' },
				{ label: 'Privacy', href: '/policy#privacy' },
				{ label: 'Shipping', href: '/policy#shipping' },
				{ label: 'Refunds', href: '/policy#cancellation' },
				{ label: 'Contact', href: '/policy#contact' }
			]
		}
	];
	const year = new Date().getFullYear();
	const logoVariant = $derived($theme === 'light' ? 'light' : 'dark');
</script>

<footer class="border-t border-border bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-4 py-8 md:py-12">
		<div class="grid grid-cols-2 gap-x-6 gap-y-6 md:gap-10 lg:grid-cols-4">
			<div class="col-span-2 space-y-2 lg:col-span-1 lg:space-y-4">
				<a href="/" class="inline-block">
					<ScLogo variant={logoVariant} />
				</a>
				<p class="max-w-xs text-sm leading-snug text-muted-foreground md:leading-relaxed">
					Open-source marketplace for indie hardware.
					<a
						href="https://github.com/TheAnimatrix/SCWeb"
						target="_blank"
						rel="noopener noreferrer"
						class="text-foreground underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground">
						Fork us on GitHub.
					</a>
				</p>
				<p class="text-sm text-muted-foreground">
					<a
						href="mailto:{SUPPORT_EMAIL}"
						class="text-foreground underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground">
						{SUPPORT_EMAIL}
					</a>
					<span aria-hidden="true"> · </span>
					<a
						href={WHATSAPP_HREF}
						target="_blank"
						rel="noopener noreferrer"
						class="text-foreground underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground">
						WhatsApp {WHATSAPP_DISPLAY}
					</a>
				</p>
			</div>

			{#each columns as column (column.title)}
				<div>
					<h3 class="mb-1 text-sm font-medium text-foreground md:mb-3">{column.title}</h3>
					<ul class="md:space-y-2">
						{#each column.links as link (link.href)}
							<li>
								<a
									href={link.href}
									class="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground md:min-h-0"
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
			class="mt-6 flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:mt-12 md:pt-6">
			<p>© {year} Selfcrafted</p>
			<PwaInstallButton />
			<a
				href="https://avarnic.com"
				target="_blank"
				rel="noopener noreferrer"
				class="group inline-flex items-center gap-1.5 transition-colors hover:text-foreground sm:ml-auto"
				aria-label="Designed by avarnic">
				<span>Designed by</span>
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
