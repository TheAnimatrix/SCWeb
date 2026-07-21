<script lang="ts">
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import type { Writable } from 'svelte/store';
	import { setCartItem, syncCartStore, type CartG } from '$lib/client/cartApi';
	import { getProductVariants } from '$lib/client/catalogApi';
	import { Breadcrumbs } from '$lib/components/shell';
	import { MakerCard, ProseSkeleton, Skeleton } from '$lib/components/sc';
	import {
		ProductGallery,
		ProductPurchasePanel,
		ProductDetailTabs,
		RelatedProducts
	} from '$lib/components/product';
	import type { Product } from '$lib/types/product';
	import { productUserRef } from '$lib/types/product';
	import { getPurchasableLimit } from '$lib/utils/stock';
	import { makerStorefrontPath } from '$lib/utils/reservedUsernames';
	import { SeoHead, JsonLd } from '$lib/components/seo';
	import { productBreadcrumbJsonLd, productJsonLd, productSeo } from '$lib/seo/meta';

	interface VariantOption {
		id: string;
		label: string;
		href: string;
	}

	let { data } = $props();

	const productItem = $derived(data.product ? (data.product as unknown as Product) : undefined);
	let indicatorCur = $state(0);
	let cartQty = $state(1);
	let addToCartSuccess: boolean | null = $state(null);
	let addToCartMsg = $state('');
	interface PageReview {
		id: string;
		user_id: string;
		rating: number;
		comment: string;
		created_at: string;
		users?: { username?: string; tier?: string };
	}

	let reviews = $state<PageReview[]>([]);
	let variants = $state<VariantOption[]>([]);
	let variantsLoading = $state(true);
	let variantNavigating = $state(false);
	let loadedVariantsForId = $state<string | null>(null);

	const isRefreshing = $derived(
		variantNavigating ||
			(!!navigating.to?.url.pathname.includes('/craft/item=') &&
				page.url.pathname.includes('/craft/item='))
	);

	const cartQtyMax = $derived(productItem ? getPurchasableLimit(productItem.stock) : 0);
	const cartStore = getContext<Writable<CartG>>('userCartStatus');

	function productHref(item: Product): string {
		return `/${item.name.replaceAll(' ', '_')}/craft/item=${item.id}`;
	}

	async function handleVariantNavigate(href: string) {
		if (!productItem || href === productHref(productItem)) return;
		variantNavigating = true;
		try {
			await goto(href, { keepFocus: true, noScroll: true });
		} finally {
			variantNavigating = false;
		}
	}

	async function loadVariants(productId: string) {
		if (!browser) return;
		variantsLoading = true;
		try {
			const result = await getProductVariants(fetch, productId);
			variants = result.ok ? result.data.variants : [];
			loadedVariantsForId = productId;
		} finally {
			variantsLoading = false;
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
		const product = productItem;
		if (!browser || !product) return;
		if (loadedVariantsForId === product.id) return;
		void loadVariants(product.id);
	});

	$effect(() => {
		const productId = productItem?.id;
		if (!productId) return;
		indicatorCur = 0;
		cartQty = 1;
		addToCartSuccess = null;
	});

	const slug = $derived(productItem?.name.replaceAll(' ', '_').toLowerCase() ?? '');
	const productUser = $derived(productUserRef(productItem?.users ?? null));
	const makerName = $derived(productItem?.author ?? productUser?.username ?? 'unknown');
	const makerLocation = $derived(productUser?.city ?? '—');
	const craftCount = $derived(data.makerCraftCount ?? 0);
	const memberSince = $derived(
		productItem
			? new Date(productItem.created_at).toLocaleDateString('en-US', {
					month: 'short',
					year: 'numeric'
				})
			: ''
	);
	const shopHref = $derived(
		productUser?.username
			? makerStorefrontPath(productUser.username)
			: `/crafts?q=${encodeURIComponent(makerName)}`
	);

	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	function incCart() {
		if (cartQty < cartQtyMax) {
			cartQty += 1;
		}
	}

	function decCart() {
		if (cartQty > 0) {
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
		if (!product) return;
		if (cartQty <= 0) {
			showCartFeedback(false, 'Quantity must be at least 1');
			return;
		}

		addToCartMsg = `${cartQty}`;

		const result = await setCartItem(fetch, product.id, cartQty, 'add');

		if (result.ok) {
			syncCartStore(cartStore, result.data.cart);
			showCartFeedback(true, addToCartMsg);
			await invalidate('cart:change');
		} else {
			showCartFeedback(false, result.error.message);
		}

		cartQty = 1;
	}
</script>

{#if productItem}
	<SeoHead meta={productSeo(productItem, page.url.origin)} />
	<JsonLd data={[productJsonLd(productItem, page.url.origin), productBreadcrumbJsonLd(productItem, page.url.origin)]} />
{/if}

<div class="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 md:py-12">
	<Breadcrumbs
		items={[
			{ label: 'home', href: '/' },
			{ label: 'crafts', href: '/crafts' },
			{ label: 'products', href: '/crafts' },
			{ label: slug }
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

				<MakerCard
					name={makerName}
					location={makerLocation}
					{craftCount}
					{memberSince}
					{shopHref} />
			</div>

			<ProductPurchasePanel
				class="min-w-0"
				product={productItem}
				bind:cartQty
				{addToCartSuccess}
				{addToCartMsg}
				{variants}
				{variantsLoading}
				{isRefreshing}
				onVariantNavigate={handleVariantNavigate}
				onIncrement={incCart}
				onDecrement={decCart}
				onAddToCart={cartSubmit} />
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
					supabase={data.supabase} />
			{/if}
		</div>

		<div class="mt-12">
			<RelatedProducts product={productItem} />
		</div>
	{/if}
</div>
