<script lang="ts">
	import { getContext } from 'svelte';
	import { goto, preloadData, invalidate } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { writable, type Writable } from 'svelte/store';
	import { changeCart, type CartG, type CartItem } from '$lib/client/cart';
	import { Breadcrumbs } from '$lib/components/shell';
	import { MakerCard, ProseSkeleton, Skeleton } from '$lib/components/sc';
	import {
		ProductGallery,
		ProductPurchasePanel,
		ProductDetailTabs,
		RelatedProducts
	} from '$lib/components/product';
	import type { Product } from '$lib/types/product';
	import { getPurchasableLimit } from '$lib/utils/stock';

	interface VariantOption {
		id: string;
		label: string;
		href: string;
	}

	let { data } = $props();

	const productItem = $derived(data.product);
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

	const isRefreshing = $derived(
		variantNavigating ||
			(!!navigating.to?.url.pathname.includes('/craft/item=') &&
				page.url.pathname.includes('/craft/item='))
	);

	const cartQtyMax = $derived(getPurchasableLimit(productItem.stock));
	const cartStore = getContext<Writable<CartG>>('userCartStatus');

	function productHref(item: Product): string {
		return `/${item.name.replaceAll(' ', '_')}/craft/item=${item.id}`;
	}

	async function handleVariantNavigate(href: string) {
		if (href === productHref(productItem)) return;
		variantNavigating = true;
		await goto(href, { keepFocus: true, noScroll: true });
	}

	async function loadVariants(product: Product) {
		variantsLoading = true;
		try {
			const currentVariant: VariantOption = {
				id: product.id,
				label: product.name,
				href: productHref(product)
			};

			if (product.type === 'product') {
				const result = await data.supabase_lt.from('products').select('*').eq('rel', product.id);
				if (result.data && !result.error && result.data.length > 0) {
					variants = [
						currentVariant,
						...result.data.map((item: Product) => ({
							id: item.id,
							label: item.name,
							href: productHref(item)
						}))
					];
					return;
				}
			} else if (product.rel) {
				const result = await data.supabase_lt.from('products').select('*').eq('rel', product.rel);
				const parentResult = await data.supabase_lt
					.from('products')
					.select('*')
					.eq('id', product.rel)
					.maybeSingle();

				const options: VariantOption[] = [];
				if (parentResult.data) {
					options.push({
						id: parentResult.data.id,
						label: parentResult.data.name,
						href: productHref(parentResult.data)
					});
				}

				if (result.data && !result.error) {
					for (const item of result.data) {
						if (!options.some((option) => option.id === item.id)) {
							options.push({
								id: item.id,
								label: item.name,
								href: productHref(item)
							});
						}
					}
				}

				if (!options.some((option) => option.id === product.id)) {
					options.push(currentVariant);
				}

				variants = options;
				return;
			}

			variants = [];
		} finally {
			variantsLoading = false;
		}
	}

	$effect(() => {
		reviews = data.reviews ?? [];
		void loadVariants(productItem);
	});

	$effect(() => {
		if (variantsLoading) return;

		for (const variant of variants) {
			if (variant.id !== productItem.id) {
				void preloadData(variant.href);
			}
		}
	});

	$effect(() => {
		productItem.id;
		variantNavigating = false;
		indicatorCur = 0;
		cartQty = 1;
		addToCartSuccess = null;
	});

	const slug = $derived(productItem.name.replaceAll(' ', '_').toLowerCase());
	const makerName = $derived(productItem.author ?? productItem.users?.username ?? 'unknown');
	const makerLocation = $derived(productItem.users?.city ?? '—');
	const memberSince = $derived(
		new Date(productItem.created_at).toLocaleDateString('en-US', {
			month: 'short',
			year: 'numeric'
		})
	);
	const shopHref = $derived(`/crafts?q=${encodeURIComponent(makerName)}`);

	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		const newItemId = page.params.item;
		const productId = productItem.id;
		if (newItemId && newItemId !== productId) {
			window.location.reload();
		}
	});

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
		if (cartQty <= 0) {
			showCartFeedback(false, 'Quantity must be at least 1');
			return;
		}

		addToCartMsg = `${cartQty}`;
		const cartItem: CartItem = {
			product_id: productItem.id,
			price: productItem.price.new,
			qty: cartQty
		};

		const result = await changeCart(
			data.supabase_lt,
			cartStore,
			cartItem,
			cartQtyMax,
			data.clientId ?? '',
			false
		);

		if (!result.error) {
			showCartFeedback(true, addToCartMsg);
			await invalidate('cart:change');
		} else {
			showCartFeedback(false, result.data);
		}

		cartQty = 1;
	}
</script>

<div class="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 md:py-12">
	<Breadcrumbs
		items={[
			{ label: 'home', href: '/' },
			{ label: 'crafts', href: '/crafts' },
			{ label: 'products', href: '/crafts' },
			{ label: slug }
		]} />

	<div class="mt-6 grid min-w-0 gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start">
		<div class="min-w-0 space-y-4">
			{#if isRefreshing}
				<div class="space-y-3" aria-busy="true" aria-label="Loading product images">
					<Skeleton class="aspect-[4/3] w-full rounded-lg" />
					<div class="flex flex-wrap gap-2">
						{#each Array(3) as _, index (index)}
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
				craftCount={1}
				{memberSince}
				{shopHref}
				avatarUrl={data.makerAvatarUrl} />
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
	</div>

	<div class="mt-10">
		{#if isRefreshing}
			<div class="space-y-4" aria-busy="true" aria-label="Loading product details">
				<div class="flex flex-wrap gap-2 border-b border-border pb-3">
					{#each Array(3) as _, index (index)}
						<Skeleton class="h-8 w-24 rounded-md" />
					{/each}
				</div>
				<ProseSkeleton class="rounded-lg border border-border bg-card p-5 md:p-6" lines={8} />
			</div>
		{:else}
			<ProductDetailTabs
				product={productItem}
				bind:reviews
				initialReviews={data.reviews ?? []}
				supabase={data.supabase_lt} />
		{/if}
	</div>

	<div class="mt-12">
		<RelatedProducts product={productItem} supabase={data.supabase_lt} />
	</div>
</div>
