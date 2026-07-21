<script lang="ts">
	import {
		type CartG,
		initCartG,
		getCart,
		mergeGuestCart,
		syncCartStore
	} from '$lib/client/cartApi';
	import './styles.css';
	import { page } from '$app/state';
	import { goto, afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import '../app.css';
	import type { Writable } from 'svelte/store';
	import { onMount, setContext, getContext } from 'svelte';
	import Toast from '$lib/components/common/Toast.svelte';
	import { toastStore } from '$lib/client/toastStore';
	import { removePostLoginURL, readPostLoginURL } from '$lib/client/postLogin';
	import { initAuthSync } from '$lib/client/authSync';
	import { initTheme } from '$lib/client/theme';
	import { SystemStatusBar, SiteHeader, SiteFooter, PwaInstallPrompt } from '$lib/components/shell';
	import { SeoHead } from '$lib/components/seo';
	import { isNoIndexPath } from '$lib/seo/site';
	import { env } from '$env/dynamic/public';
	import { pwaInfo } from 'virtual:pwa-info';

	let { data, children } = $props();

	const webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	const userRoute = $derived(data.session?.user ? '/user/profile/account' : '/user/sign');

	const userProfile = $derived.by(() => {
		const authUser = data.session?.user;
		if (!authUser) return null;

		const metadata = authUser.user_metadata ?? {};
		const avatarUrl =
			(typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
			(typeof metadata.picture === 'string' && metadata.picture) ||
			null;

		const displayName =
			data.username ||
			(typeof metadata.full_name === 'string' && metadata.full_name) ||
			(typeof metadata.name === 'string' && metadata.name) ||
			authUser.email?.split('@')[0] ||
			'Account';

		return { displayName, avatarUrl };
	});

	setContext('userCartStatus', initCartG());
	const cart_store = getContext<Writable<CartG>>('userCartStatus');

	const currentPath = $derived(page.url.pathname);
	const cartCount = $derived($cart_store.itemCount);
	const shouldNoIndex = $derived(isNoIndexPath(currentPath));
	const googleVerification = $derived(env.PUBLIC_GOOGLE_SITE_VERIFICATION);

	let topBar = $state<HTMLElement | null>(null);

	$effect(() => {
		if (!browser || !topBar) return;

		const bar = topBar;
		const syncTopbarHeight = () => {
			document.documentElement.style.setProperty('--site-topbar-height', `${bar.offsetHeight}px`);
		};

		syncTopbarHeight();
		const observer = new ResizeObserver(syncTopbarHeight);
		observer.observe(topBar);
		return () => observer.disconnect();
	});

	onMount(() => {
		initTheme();

		const postLoginUrl = readPostLoginURL();
		if (postLoginUrl) {
			goto(postLoginUrl, { replaceState: true });
			removePostLoginURL();
		}

		if (pwaInfo) {
			void import('virtual:pwa-register').then(({ registerSW }) => {
				registerSW({ immediate: true });
			});
		}

		if (!data.supabase) return;

		const supabaseClient = data.supabase;

		const loadCart = () => {
			getCart(fetch).then((cart) => {
				if (cart.ok) {
					syncCartStore(cart_store, cart.data.cart);
				}
			});
		};

		if ('requestIdleCallback' in window) {
			requestIdleCallback(loadCart, { timeout: 2000 });
		} else {
			setTimeout(loadCart, 100);
		}

		initAuthSync(supabaseClient, {
			onSignedIn: async () => {
				const mergeResult = await mergeGuestCart(fetch, data.clientId);
				if (!mergeResult.ok) {
					console.error('Failed to merge guest cart:', mergeResult.error);
					toastStore.show("Couldn't merge your guest cart", 'error');
				}
				const cart = await getCart(fetch);
				if (cart.ok) {
					syncCartStore(cart_store, cart.data.cart);
				}
			}
		});
	});

	afterNavigate(({ from, to }) => {
		if (!browser || !from || from.route.id === to?.route.id) return;
		document.body.scrollTop = 0;
		document.documentElement.scrollTop = 0;
	});
</script>

{#if shouldNoIndex}
	<SeoHead meta={{ noindex: true }} />
{/if}

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- vite-plugin-pwa generated manifest link -->
	{@html webManifestLink}
	{#if googleVerification}
		<meta name="google-site-verification" content={googleVerification} />
	{/if}
</svelte:head>

<div class="flex min-h-screen w-full max-w-full flex-col bg-background text-foreground">
	<div bind:this={topBar} class="fixed inset-x-0 top-0 z-40 w-full max-w-full bg-background">
		<SystemStatusBar />
		<SiteHeader {cartCount} {userRoute} {userProfile} {currentPath} />
	</div>

	<main class="flex-1 pt-[var(--site-topbar-height)]">
		{@render children?.()}
	</main>

	<SiteFooter githubStars={data.githubStars} />
	<Toast />
	<PwaInstallPrompt />
</div>

<style>
	:global(body)::-webkit-scrollbar {
		width: 6px;
	}

	:global(body)::-webkit-scrollbar-track {
		background: hsl(var(--background));
	}

	:global(body)::-webkit-scrollbar-thumb {
		background-color: hsl(var(--border));
		border-radius: 12px;
	}

	:global(body)::-webkit-scrollbar-thumb:hover {
		background-color: hsl(var(--muted-foreground) / 0.5);
	}
</style>
