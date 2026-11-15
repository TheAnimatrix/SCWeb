<script lang="ts">
	import { getContext } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import type { Writable } from 'svelte/store';
	import { setCartItem, syncCartStore, type CartG } from '$lib/client/cartApi';
	import { Breadcrumbs } from '$lib/components/shell';
	import { MakerCard, ProseSkeleton, ScButton, Skeleton } from '$lib/components/sc';
	import {
		ProductGallery,
		ProductPurchasePanel,
		ProductDetailTabs,
		RelatedProducts
	} from '$lib/components/product';
	import type { Product } from '$lib/types/product';
	import { productUserRef } from '$lib/types/product';
	import { getPurchasableLimit, isOutOfStock } from '$lib/utils/stock';
	import { makerStorefrontPath } from '$lib/utils/reservedUsernames';
	import { formatUsernameDisplay } from '$lib/utils/formatUsername';
	import { formatInr, formatMonthYear } from '$lib/utils/format';
	import { productPath } from '$lib/seo/product';
	import { SeoHead, JsonLd } from '$lib/components/seo';
	import { productBreadcrumbJsonLd, productJsonLd, productSeo } from '$lib/seo/meta';

	let { data } = $props();

	const productItem = $derived(data.product ? (data.product as unknown as Product) : undefined);
	let indicatorCur = $state(0);
	let cartQty = $state(1);
	let addToCartSuccess: boolean | null = $state(null);
	let addToCartMsg = $state('');
	let addedQty = $state(1);
	let isAdding = $state(false);
	interface PageReview {
		id: string;
		user_id: string;
		rating: number;
		comment: string;
		created_at: string;
		users?: { username?: string; tier?: string };
	}

	let reviews = $state<PageReview[]>([]);
	// Variants come from the server load, so the panel never jumps when they arrive.
	const variants = $derived(data.variants ?? []);
	let variantNavigating = $state(false);

	const isRefreshing = $derived(
		variantNavigating ||
			(!!navigating.to?.url.pathname.includes('/craft/item=') &&
				page.url.pathname.includes('/craft/item='))
	);

	const cartQtyMax = $derived(productItem ? getPurchasableLimit(productItem.stock) : 0);
	const cartStore = getContext<Writable<CartG>>('userCartStatus');

	async function handleVariantNavigate(href: string) {
		if (!productItem || href === productPath(productItem)) return;
		variantNavigating = true;
		try {
			await goto(href, { keepFocus: true, noScroll: true });
		} finally {
			variantNavigating = false;
		}
	}

	function mapPageReviews(source: typeof data.reviews): PageReview[] {
		return (source ?? []).map((review) => ({
			id: review.id,
			user_id: review.user_id,
			rating: review.rating,
			comment: review.comment ?? '',
			created_at: review.created_at,
			users:
				review.users &&
				typeof review.users === 'object' &&
				!('error' in review.users) &&
				'username' in review.users
					? {
							username:
								typeof (review.users as { username?: unknown }).username === 'string'
									? (review.users as { username: string }).username
									: undefined,
							tier:
								typeof (review.users as { tier?: unknown }).tier === 'string'
									? (review.users as { tier: string }).tier
									: undefined
						}
					: undefined
		}));
	}

	const mappedReviews = $derived(mapPageReviews(data.reviews));

	$effect(() => {
		const next = mappedReviews;
		reviews = next;
	});

	$effect(() => {
		const productId = productItem?.id;
		if (!productId) return;
		indicatorCur = 0;
		cartQty = 1;
		addToCartSuccess = null;
	});

	const productUser = $derived(productUserRef(productItem?.users ?? null));
	const makerRawName = $derived(productItem?.author ?? productUser?.username ?? '');
	const makerName = $derived(makerRawName ? formatUsernameDisplay(makerRawName) : 'Unknown maker');
	const makerInfo = $derived(data.maker ?? null);
	const makerLocation = $derived(makerInfo?.location ?? null);
	const craftCount = $derived(data.makerCraftCount ?? 0);
	// The maker's own date (storefront published / approved), never the product's.
	const sellingSince = $derived(
		makerInfo?.sellingSince ? formatMonthYear(makerInfo.sellingSince) : null
	);
	// Storefronts only exist once approved and live; otherwise search for the maker's listings.
	const storefrontLive = $derived(Boolean(makerInfo?.storefrontLive && productUser?.username));
	const shopHref = $derived(
		storefrontLive && productUser?.username
			? makerStorefrontPath(productUser.username)
			: `/crafts?q=${encodeURIComponent(makerRawName)}`
	);
	const shopLabel = $derived(storefrontLive ? 'View shop' : 'See listings');
	const unavailable = $derived(productItem ? isOutOfStock(productItem.stock) : true);

	// Mobile: a bottom bar with price and "Add to cart" once the purchase panel scrolls away.
	let panelEl = $state<HTMLElement | null>(null);
	let panelScrolledPast = $state(false);

	$effect(() => {
		const el = panelEl;
		if (!el || typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(([entry]) => {
			panelScrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
		});
		observer.observe(el);
		return () => observer.disconnect();
	});

	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	function incCart() {
		if (cartQty < cartQtyMax) {
			cartQty += 1;
		}
	}

	function decCart() {
		if (cartQty > 1) {
			cartQty -= 1;
		}
	}

	function showCartFeedback(success: boolean, message: string) {
		addToCartSuccess = success;
		addToCartMsg = message;
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			addToCartSuccess = null;
		}, 5000);
	}

	async function cartSubmit() {
		const product = productItem;
		if (!product || isAdding || isOutOfStock(product.stock)) return;
		if (cartQty < 1) cartQty = 1;

		const qty = cartQty;
		isAdding = true;
		try {
			const result = await setCartItem(fetch, product.id, qty, 'add');

			if (result.ok) {
				syncCartStore(cartStore, result.data.cart);
				addedQty = qty;
				showCartFeedback(true, '');
				// Reset only after a successful add; on failure the buyer keeps their quantity.
				cartQty = 1;
				await invalidate('cart:change');
			} else {
				showCartFeedback(false, result.error.message);
			}
		} finally {
			isAdding = false;
		}
	}
</script>

{#if productItem}
	<SeoHead meta={productSeo(productItem, page.url.origin)} />
	<JsonLd
		data={[
			productJsonLd(productItem, page.url.origin),
			productBreadcrumbJsonLd(productItem, page.url.origin)
		]} />
{/if}

<div class="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 md:py-12">
	<Breadcrumbs
		items={[
			{ label: 'Home', href: '/' },
			{ label: 'Shop', href: '/crafts' },
			{ label: productItem?.name ?? 'Product' }
		]} />

	<div class="mt-6 grid min-w-0 gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start">
		{#if productItem}
			<div class="min-w-0 space-y-4">
				{#if isRefreshing}
					<div class="space-y-3" aria-busy="true" aria-label="Loading product images">
						<Skeleton class="aspect-[4/3] w-full rounded-lg" />
						<div class="flex flex-wrap gap-2">
							{#each [...Array(3).keys()] as index (index)}
								<Skeleton class="h-16 w-16 rounded-md" />
							{/each}
						</div>
					</div>
				{:else}
					<ProductGallery product={productItem} bind:indicatorCur />
				{/if}

				<!-- Desktop: maker card under the gallery. Mobile shows it after the purchase panel. -->
				<MakerCard
					class="hidden md:block"
					name={makerName}
					location={makerLocation}
					{craftCount}
					{sellingSince}
					{shopHref}
					{shopLabel} />
			</div>

			<div class="min-w-0 space-y-4" bind:this={panelEl}>
				<ProductPurchasePanel
					class="min-w-0"
					product={productItem}
					{makerName}
					makerHref={shopHref}
					shipsFrom={makerLocation}
					bind:cartQty
					{addToCartSuccess}
					{addToCartMsg}
					{addedQty}
					{isAdding}
					{variants}
					{isRefreshing}
					onVariantNavigate={handleVariantNavigate}
					onIncrement={incCart}
					onDecrement={decCart}
					onAddToCart={cartSubmit} />

				<MakerCard
					class="md:hidden"
					name={makerName}
					location={makerLocation}
					{craftCount}
					{sellingSince}
					{shopHref}
					{shopLabel} />
			</div>
		{/if}
	</div>

	{#if productItem}
		<div class="mt-10">
			{#if isRefreshing}
				<div class="space-y-4" aria-busy="true" aria-label="Loading product details">
					<div class="flex flex-wrap gap-2 border-b border-border pb-3">
						{#each [...Array(3).keys()] as index (index)}
							<Skeleton class="h-8 w-24 rounded-md" />
						{/each}
					</div>
					<ProseSkeleton class="rounded-lg border border-border bg-card p-5 md:p-6" lines={8} />
				</div>
			{:else}
				<ProductDetailTabs
					product={productItem}
					bind:reviews
					initialReviews={mappedReviews}
					reviewsError={data.reviewsError}
					supabase={data.supabase} />
			{/if}
		</div>

		<RelatedProducts product={productItem} class="mt-12" />
	{/if}
</div>

{#if productItem && panelScrolledPast && !isRefreshing}
	<div
		class="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:hidden">
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm text-muted-foreground">{productItem.name}</p>
			<p class="text-base font-semibold text-foreground">{formatInr(productItem.price.new)}</p>
		</div>
		<ScButton
			class="min-h-11 shrink-0 text-sm disabled:opacity-50"
			disabled={unavailable || isAdding}
			onclick={cartSubmit}>
			{unavailable ? 'Out of stock' : isAdding ? 'Adding…' : 'Add to cart'}
		</ScButton>
	</div>
{/if}
