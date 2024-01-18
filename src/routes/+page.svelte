<script lang="ts">
	import BannerIndicator from '$libs/components/fundamental/banner_indicator.svelte';
	import ProductList from './product_list.svelte';
	import { goto } from '$app/navigation';
	import { products } from '$libs/stores/products.js';

	let indicator_cur = 0;
	let indicator_max = 5;
	let cinterval : number = 5000;
</script>

<div id="top">
	<div id="subtop">
		<div id="feat-mb-text">
			<div class="font-figtree font-bold text-5xl text-scpurplel2 pb-4">Editor's<br /> choice</div>
			<div id="feat-mb-rect" class="w-max h-auto bg-black border-2 border-t-8 border-solid border-[#ffeeee] p-4 pr-8 hover:border-scpurplel1">
				<div class="title justify-center text-4xl text-white font-bold">Lornode V2</div>
				<div class="subtitle font-bold text-xl text-[#b983ff]">By Animatrix</div>
			</div>
		</div>
		<!-- <img id="feat-mb-img" src="src/libs/images/lornode_wide.png" alt="Featured Banner" /> -->
		<BannerIndicator curActive={indicator_cur} max={indicator_max} wActive="w-[6%] max-sm:w-[15%]" wNormal="w-[2%] max-sm:w-[6%]" hoverNormal="hover:w-[3%]" interval={cinterval} />
		<ProductList
			products={$products}
			getLink={(i, product) => {;
				return `/${product.name.replaceAll(' ', '_')}/craft/item=${i}`;
			}}
		/>
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
		background-image: url('/images/lornode_wide.png');
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
