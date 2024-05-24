<script lang="ts">
	import Icon from '@iconify/svelte';
	import { setLoading } from '$lib/client/loading';
	import { getContext, onMount } from 'svelte';
	import { writable, type Writable } from 'svelte/store';
	import type { Product } from '$lib/types/product';
	import { type Banner, getBannerCount, getBanner } from '$lib/client/banner';
	import BannerIndicator from '$lib/components/fundamental/banner_indicator.svelte';
	import ProductList from './product_list.svelte';
	import { goto, invalidate } from '$app/navigation';

	let indicator_cur = 0;
	let cinterval: number = 5000;

	let getLink = (i: number, product: Product) => {
		return `/${product.name.replaceAll(' ', '_')}/craft/item=${i}`;
	};

	let image = writable('');
	$: {
		image.set(getBanner(indicator_cur).bannerUrl);
		
	}

	export let data;

	let products: Product[];

	let load_store = getContext<Writable<boolean>>('loading');
	async function setup() {
		setLoading(load_store,true);
		
		let resp = await data.supabase_lt.from('products').select('*');
		if (resp.error || !resp.data) {
			
		} else {
			products = resp.data as Product[];
		}
		setLoading(load_store,false);
	}

	setup();
</script>

<div id="top">
	<div id="subtop">
		<div id="feat-mb-text" style="background-image: url({$image})">
			<div class="h-16"></div>
			<div
				id="feat-mb-rect"
				class="ml-4 md:ml-8 w-max h-auto bg-black border-2 border-t-8 border-solid border-[#ffeeee] p-4 pr-8 hover:border-scpurplel1">
				<div class="title justify-center text-3xl text-white font-bold">Lornode V2</div>
				<div class="subtitle font-bold text-xl text-scpurplel0">By Animatrix</div>
			</div>
		</div>
		<!-- <img id="feat-mb-img" src="src/libs/images/lornode_wide.png" alt="Featured Banner" /> -->
		<BannerIndicator
			bind:curActive={indicator_cur}
			max={getBannerCount()}
			wActive="w-[6%] max-sm:w-[15%]"
			wNormal="w-[2%] max-sm:w-[6%]"
			hoverNormal="hover:w-[3%]"
			interval={cinterval} />
		<ProductList {products} {getLink} accent1="#10182f" accent2="#202c52" accent3="#5579e3" />
	</div>
</div>

<style>
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

	#feat-mb-text {
		width: 100%;
		background-position: center;
		background-repeat: no-repeat;
		background-size: cover;
		border-radius: 18px;
		padding-top: 10%;
		padding-bottom: 24px;
	}

	#feat-mb-text > * {
	}
</style>
