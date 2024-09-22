<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getContext, onMount } from 'svelte';
	import { writable, type Writable } from 'svelte/store';
	import type { Product } from '$lib/types/product';
	import { type Banner } from '$lib/client/banner';
	import BannerIndicator from '$lib/components/fundamental/banner_indicator.svelte';
	import ProductList from './product_list.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import Loader from '$lib/components/fundamental/Loader.svelte';

	export let data;

	let indicator_cur = 0;
	let cinterval: number = 5000;

	let getLink = (i: number, product: Product) => {
		return `/${product.name.replaceAll(' ', '_')}/craft/item=${i}`;
	};

	let image = writable('');
	let name: string, author: string, url: string;
	$: {
		if (data.banners?.[indicator_cur]?.img) {
			image.set(data.banners?.[indicator_cur].img);
			name = data.banners?.[indicator_cur].name;
			author = data.banners?.[indicator_cur].author;
			url = data.banners?.[indicator_cur].url;
		}
	}

	let products: Product[];
	let default_filter = "Products";

	let load_store = getContext<Writable<boolean>>('loading');

	let loading = false;
	async function setup(filterf:string|null) {
		loading = true;
		let filter = filterf ?? $page.url.searchParams.get('filter') ?? default_filter;
		let query = data.supabase_lt.from('products').select('*');
		if (filter) {
			if(filter == 'Products') {
				filter = 'product';
			} else if(filter == 'Spares') {
				filter = 'spare';
			}
			if(filter != 'All') {
				query = query.eq('type', filter);
			}
		}
		let resp = await query;
		if (resp.error || !resp.data) {
			console.error(resp.error);
		} else {
			products = resp.data as Product[];
		}
		loading = false;
	}

	setup(null);

</script>

<!-- #feat-mb-text {
	width: 100%;
	background-position: center;
	background-repeat: no-repeat;
	background-size: cover;
	border-radius: 18px;
	padding-top: 10%;
	padding-bottom: 24px;
} -->

<div id="top">
	<div id="subtop">
		{#if data.banners?.length}
			<a
				href={url}
				class="w-full bg-center bg-no-repeat bg-cover rounded-lg pt-[20%] lg:pt-[10%] pb-2 md:pb-4"
				style="background-image: url({$image})">
				<div class="h-16"></div>
				<div
					class="ml-2 md:ml-4 mr-2 h-auto w-fit bg-scpurpled1 rounded-xl p-2 pr-4 md:p-4 md:pr-8 hover:border-scpurplel1">
					<div
						class="title justify-center text-xl md:text-2xl lg:text-3xl text-white font-bold text-ellipsis">
						{name}
					</div>
					<div class="subtitle font-bold text-sm md:text-lg lg:text-xl text-scpurplel0">
						By {author}
					</div>
				</div>
			</a>
			<!-- <img id="feat-mb-img" src="src/libs/images/lornode_wide.png" alt="Featured Banner" /> -->
			<BannerIndicator
				bind:curActive={indicator_cur}
				max={data.banners?.length ?? 0}
				wActive="w-[6%] max-sm:w-[15%]"
				wNormal="w-[2%] max-sm:w-[6%]"
				hoverNormal="hover:w-[3%]"
				interval={cinterval} />
		{/if}
		<div class="flex w-full flex-col mt-4">
			<!-- <div class="flex flex-start w-full mt-4 items-center">
				<span class="text-xl text-white font-semibold">Filters</span>
				<Icon icon="mingcute:filter-2-fill" class="text-white text-2xl ml-4" />
			</div> -->
			<div id="filters" class="flex gap-4 mt-2 items-center">
				<button on:click={()=>{goto('?filter=All');setup("All")}} class="text-scpurplel0 {$page.url.searchParams.get('filter') == 'All' ? 'highlighted' : ''}">All</button>
				<button on:click={()=>{goto('?filter=Products');setup("Products")}} class="text-scpurplel0 {$page.url.searchParams.get('filter') != null ? $page.url.searchParams.get('filter') == 'Products' ? 'highlighted' : '' : 'highlighted'}">Products</button>
				<button on:click={()=>{goto('?filter=Spares',);setup("Spares")}} class="text-scpurplel0 {$page.url.searchParams.get('filter') == 'Spares' ? 'highlighted' : ''} capitalize">Spares</button>
			</div>
		</div>
		{#if loading}
		<div class="flex flex-col mt-20 justify-center items-center w-full">
			<Loader />
			<div class="text-white text-center text-xl mt-4 mx-auto opacity-50">Loading</div>
		</div>
		{:else}
		{#key products}
			<ProductList {products} {getLink} accent1="#10182f" accent2="#202c52" accent3="#5579e3" />
		{/key}
		{/if}
	</div>
</div>

<style lang="postcss">
	#top {
		height: 100%;
		width: 100%;
		justify-content: center;
		display: flex;
	}

	#subtop {
		width: 65%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	@media only screen and (max-width: 1260px) {
		#subtop {
			width: 95%;
		}
	}

	.highlighted {
		@apply bg-scpurpled2 p-2 py-1 rounded-full capitalize font-semibold
	}
</style>
