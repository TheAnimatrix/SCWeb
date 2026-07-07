<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/state';
	import { writable, type Writable } from 'svelte/store';
	import { changeCart, type CartG, type CartItem } from '$lib/client/cart';
	import { Breadcrumbs } from '$lib/components/shell';
	import { MakerCard } from '$lib/components/sc';
	import {
		ProductGallery,
		ProductPurchasePanel,
		ProductDetailTabs,
		RelatedProducts
	} from '$lib/components/product';
	import type { Product } from '$lib/types/product';

	interface VariantOption {
		id: string;
		label: string;
		href: string;
	}

	let { data } = $props();

	const productItem = $derived(data.product);
	let indicatorCur = $state(0);
	let cartQty = $state(0);
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

	const cartQtyMax = $derived(productItem.stock.count);
	const cartStore = getContext<Writable<CartG>>('userCartStatus');

	function productHref(item: Product): string {
		return `/${item.name.replaceAll(' ', '_')}/craft/item=${item.id}`;
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

	async function cartSubmit() {
		if (cartQty <= 0) return;

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
			addToCartSuccess = true;
		} else {
			addToCartSuccess = false;
			addToCartMsg = result.data;
		}

		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			addToCartSuccess = null;
		}, 5000);

		cartQty = 0;
	}
</script>

<div class="mx-auto max-w-7xl px-4 py-8 md:py-12">
		<Breadcrumbs
			items={[
				{ label: 'home', href: '/' },
				{ label: 'crafts', href: '/crafts' },
				{ label: 'products', href: '/crafts' },
				{ label: slug }
			]}
		/>

		<div class="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start">
			<div class="space-y-4">
				<ProductGallery product={productItem} bind:indicatorCur />

				<MakerCard
					name={makerName}
					location={makerLocation}
					craftCount={1}
					{memberSince}
					{shopHref}
				/>
			</div>

			<ProductPurchasePanel
				product={productItem}
				bind:cartQty
				{addToCartSuccess}
				{addToCartMsg}
				{variants}
				{variantsLoading}
				onIncrement={incCart}
				onDecrement={decCart}
				onAddToCart={cartSubmit}
			/>
		</div>

		<div class="mt-10">
			<ProductDetailTabs
				product={productItem}
				bind:reviews
				initialReviews={data.reviews ?? []}
				supabase={data.supabase_lt}
			/>
		</div>

		<div class="mt-12">
			<RelatedProducts product={productItem} supabase={data.supabase_lt} />
		</div>
</div>
