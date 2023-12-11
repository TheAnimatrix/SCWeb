<script>
	import BannerIndicator from '$libs/components/fundamental/banner_indicator.svelte';
	import ProductList from './product_list.svelte';
	import { goto } from '$app/navigation';
	import { products } from '$libs/stores/products.js';

	let indicator_cur = 0;
	let indicator_max = 5;
</script>

<div id="top">
	<div id="subtop">
		<div id="feat-mb-text">
			<div class="font-figtree font-bold text-5xl text-[#CAFFC7] pb-4">Editor's<br /> choice</div>
			<div id="feat-mb-rect">
				<div class="title">Lornode V2</div>
				<div class="subtitle">By Animatrix</div>
			</div>
		</div>
		<!-- <img id="feat-mb-img" src="src/libs/images/lornode_wide.png" alt="Featured Banner" /> -->
		<BannerIndicator curActive={indicator_cur} max={indicator_max} colorSecondary="bg-sccyan" colorAccent="hover:bg-sccyanl1" />
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
		background-color: #232323;
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

	#feat-mb-rect {
		width: max-content;
		height: auto;
		background: #000000;
		border-width: 2px 2px 13px 2px;
		border-style: solid;
		border-color: #ffeeee;
		padding: 15px 30px 15px 30px;
	}

	#feat-mb-rect:hover {
		cursor: pointer;
		border-color: #9fcdc0;
	}

	.title {
		justify-content: center;
		font-size: 175%;
		font-weight: bold;
		color: white;
	}

	.subtitle {
		font-size: 100%;
		color: #b983ff;
	}
</style>
