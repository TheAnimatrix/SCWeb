<script lang="ts">
	import { loading } from '$lib/stores/loading';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import type { Product } from '$lib/stores/types/product';
	import { type Banner, getBannerCount, getBanner } from '$lib/stores/banner';
	import BannerIndicator from '$lib/components/fundamental/banner_indicator.svelte';
	import ProductList from './product_list.svelte';
	import { goto } from '$app/navigation';

	let indicator_cur = 0;
	let cinterval: number = 5000;

	let getLink = (i: number, product: Product) => {
		return `/${product.name.replaceAll(' ', '_')}/craft/item=${i}`;
	};

	let image = writable('');
	$: {
		image.set(getBanner(indicator_cur).bannerUrl);
		console.log($image);
	}

	export let data;

	let products: Product[];
	async function setup() {
		loading.set(true);
		console.log("setup:mainpage");
		let resp = await data.supabase_lt.from('products').select('*');
		if (resp.error || !resp.data) {
			console.log('error ' + resp.error);
		} else {
			products = resp.data as Product[];
		}
		loading.set(false);
	}

	setup();
</script>

<div id="top">
	<div id="subtop">
		<div id="feat-mb-text" style="background-image: url({$image})">
			<div class="font-figtree font-bold text-5xl text-scpurplel2 pb-4">Editor's<br /> choice</div>
			<div
				id="feat-mb-rect"
				class="w-max h-auto bg-black border-2 border-t-8 border-solid border-[#ffeeee] p-4 pr-8 hover:border-scpurplel1"
			>
				<div class="title justify-center text-4xl text-white font-bold">Lornode V2</div>
				<div class="subtitle font-bold text-xl text-[#b983ff]">By Animatrix</div>
			</div>
		</div>
		<!-- <img id="feat-mb-img" src="src/libs/images/lornode_wide.png" alt="Featured Banner" /> -->
		<BannerIndicator
			bind:curActive={indicator_cur}
			max={getBannerCount()}
			wActive="w-[6%] max-sm:w-[15%]"
			wNormal="w-[2%] max-sm:w-[6%]"
			hoverNormal="hover:w-[3%]"
			interval={cinterval}
		/>
		<ProductList {products} {getLink} accent1="#1C102F" accent2="#342052" accent3="#8955e3" />
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
		margin-left: 40px;
	}
</style>
