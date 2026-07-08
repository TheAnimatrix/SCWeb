<script lang="ts">
	import type { Component } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import Package from '@lucide/svelte/icons/package';
	import Printer from '@lucide/svelte/icons/printer';
	import Hammer from '@lucide/svelte/icons/hammer';
	import LogIn from '@lucide/svelte/icons/log-in';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import ScLogo from './ScLogo.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import { theme } from '$lib/client/theme';
	import {
		sheetBackdropIn,
		sheetBackdropOut,
		sheetPanelIn,
		sheetPanelOut
	} from '$lib/utils/sheetTransition';

	interface NavLink {
		label: string;
		href: string;
		icon?: Component<{ class?: string }>;
	}

	interface UserProfile {
		displayName: string;
		avatarUrl: string | null;
	}

	interface Props {
		cartCount: number;
		userRoute: string;
		userProfile: UserProfile | null;
		currentPath: string;
	}

	let { cartCount, userRoute, userProfile, currentPath }: Props = $props();

	let mobileMenuOpen = $state(false);
	let mobileMenuScrollLocked = $state(false);

	const navLinks: NavLink[] = [
		{ label: 'Crafts', href: '/crafts', icon: Package },
		{ label: 'Start crafting', href: '/crafting', icon: Hammer },
		{ label: '3D Print', href: '/3dp-portal', icon: Printer }
	];

	const isSignedIn = $derived(userProfile !== null);
	const logoVariant = $derived($theme === 'light' ? 'light' : 'dark');
	const profileInitial = $derived(
		userProfile?.displayName?.charAt(0).toUpperCase() ?? '?'
	);

	function isActive(href: string): boolean {
		return currentPath === href || currentPath.startsWith(`${href}/`);
	}

	function navLinkClass(href: string, mobile = false): string {
		const active = isActive(href);

		if (active) {
			return mobile
				? 'inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90'
				: 'inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90';
		}

		return mobile
			? 'flex items-center gap-2.5 py-2 text-sm font-medium text-foreground/75 transition-colors hover:text-foreground'
			: 'inline-flex items-center gap-1.5 text-sm font-medium text-foreground/75 transition-colors hover:text-foreground';
	}

	function profileLinkClass(): string {
		return `inline-flex items-center gap-2 text-sm font-medium transition-colors ${
			isActive(userRoute)
				? 'text-foreground'
				: 'text-foreground/75 hover:text-foreground'
		}`;
	}

	function mobileCtaClass(variant: 'secondary' | 'primary'): string {
		const base =
			'inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors';

		return variant === 'primary'
			? `${base} bg-primary text-primary-foreground hover:bg-primary/90`
			: `${base} border border-border bg-card text-foreground hover:bg-muted`;
	}

	function cartLinkClass(): string {
		const active = isActive('/cart');
		return active
			? 'inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-sm font-semibold tabular-nums text-primary-foreground transition-colors hover:bg-primary/90'
			: 'inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-foreground/75 transition-colors hover:text-foreground';
	}

	function toggleMobileMenu(): void {
		if (mobileMenuOpen) {
			mobileMenuOpen = false;
			return;
		}

		mobileMenuOpen = true;
		mobileMenuScrollLocked = true;
	}

	function closeMobileMenu(): void {
		mobileMenuOpen = false;
	}

	function onMobileMenuOutroEnd(): void {
		if (!mobileMenuOpen) {
			mobileMenuScrollLocked = false;
		}
	}

	afterNavigate(() => {
		closeMobileMenu();
	});

	$effect(() => {
		if (!mobileMenuScrollLocked) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		function onKeydown(event: KeyboardEvent): void {
			if (event.key === 'Escape') closeMobileMenu();
		}

		window.addEventListener('keydown', onKeydown);

		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', onKeydown);
		};
	});
</script>

<header class="border-b border-border bg-background">
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
		<a href="/" class="flex shrink-0 items-center" onclick={closeMobileMenu}>
			<ScLogo variant={logoVariant} />
		</a>

		<nav class="hidden items-center gap-8 md:flex" aria-label="Main navigation">
			{#each navLinks as link (link.href)}
				<a href={link.href} class={navLinkClass(link.href)}>
					{#if link.icon}
						<span aria-hidden="true">
							<link.icon class="size-4 shrink-0" />
						</span>
					{/if}
					{link.label}
				</a>
			{/each}
		</nav>

		<div class="hidden items-center gap-4 md:flex">
			<ThemeToggle />

			<a
				href={userRoute}
				class={profileLinkClass()}
				aria-label={isSignedIn && userProfile ? 'Account' : 'Sign in'}
			>
				{#if isSignedIn && userProfile}
					<span
						class="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-foreground bg-muted"
						aria-hidden="true"
					>
						{#if userProfile.avatarUrl}
							<img
								src={userProfile.avatarUrl}
								alt=""
								class="size-full object-cover"
								referrerpolicy="no-referrer"
							/>
						{:else}
							<span class="font-mono text-xs font-medium uppercase text-foreground">
								{profileInitial}
							</span>
						{/if}
					</span>
				{:else}
					<LogIn class="size-4 shrink-0" aria-hidden="true" />
					Sign in
				{/if}
			</a>

			<a
				href="/cart"
				class={cartLinkClass()}
				aria-label="{cartCount} {cartCount === 1 ? 'item' : 'items'} in cart"
			>
				<ShoppingCart class="size-4 shrink-0" aria-hidden="true" />
				{cartCount}
			</a>
		</div>

		<div class="flex items-center gap-1 md:hidden">
			<ThemeToggle mobile />

			<button
				type="button"
				class="inline-flex size-9 items-center justify-center text-foreground"
				aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
				aria-expanded={mobileMenuOpen}
				onclick={toggleMobileMenu}
			>
				{#if mobileMenuOpen}
					<X class="size-5" />
				{:else}
					<Menu class="size-5" />
				{/if}
			</button>
		</div>
	</div>

</header>

{#if mobileMenuOpen}
	<button
		type="button"
		class="fixed inset-0 z-50 bg-black/40 md:hidden"
		aria-label="Close menu"
		onclick={closeMobileMenu}
		in:sheetBackdropIn
		out:sheetBackdropOut
	></button>

	<div
		class="fixed inset-x-0 bottom-0 z-[51] flex max-h-[85vh] flex-col rounded-t-xl border-t border-border bg-background shadow-2xl md:hidden"
		role="dialog"
		aria-modal="true"
		aria-label="Mobile navigation"
		in:sheetPanelIn
		out:sheetPanelOut
		onoutroend={onMobileMenuOutroEnd}
	>
		<div class="flex shrink-0 justify-center pt-3 pb-1" aria-hidden="true">
			<div class="h-1 w-10 rounded-full bg-muted"></div>
		</div>

		<nav class="flex-1 overflow-y-auto px-4 pt-2 pb-4" aria-label="Mobile navigation">
			<ul class="flex flex-col gap-1">
				{#each navLinks as link (link.href)}
					<li class:py-1={isActive(link.href)}>
						<a href={link.href} class={navLinkClass(link.href, true)}>
							{#if link.icon}
								<span aria-hidden="true">
									<link.icon class="size-4 shrink-0" />
								</span>
							{/if}
							{link.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="shrink-0 border-t border-border px-4 py-3">
			<div class="flex gap-3">
				<a
					href={userRoute}
					class={mobileCtaClass('secondary')}
					aria-label={isSignedIn && userProfile ? 'Account' : 'Sign in'}
				>
					{#if isSignedIn && userProfile}
						<span
							class="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-foreground bg-muted"
							aria-hidden="true"
						>
							{#if userProfile.avatarUrl}
								<img
									src={userProfile.avatarUrl}
									alt=""
									class="size-full object-cover"
									referrerpolicy="no-referrer"
								/>
							{:else}
								<span class="font-mono text-[10px] font-medium uppercase text-foreground">
									{profileInitial}
								</span>
							{/if}
						</span>
						Account
					{:else}
						<LogIn class="size-4 shrink-0" aria-hidden="true" />
						Sign in
					{/if}
				</a>

				<a
					href="/cart"
					class={mobileCtaClass('primary')}
					aria-label="{cartCount} {cartCount === 1 ? 'item' : 'items'} in cart"
				>
					<ShoppingCart class="size-4 shrink-0" aria-hidden="true" />
					Cart
					{#if cartCount > 0}
						<span
							class="inline-flex min-w-5 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums"
						>
							{cartCount}
						</span>
					{/if}
				</a>
			</div>
		</div>
	</div>
{/if}
