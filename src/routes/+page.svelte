<script>
	import BannerIndicator from "./banner_indicator.svelte";
	import ProductList from "./product_list.svelte";

	let indicator_cur = 0;
	let indicator_max = 5;
</script>

<div id="top">
	<div id="subtop">
		<div id="feat-mb-text">
			<div class="superTitle">Editor's<br/> choice</div>
			<div id="feat-mb-rect">
				<div class="title">Lornode V2</div>
				<div class="subtitle">By Animatrix</div>
            </div>
		</div>
		<!-- <img id="feat-mb-img" src="src/libs/images/lornode_wide.png" alt="Featured Banner" /> -->
        <BannerIndicator curActive="{indicator_cur}" max="{indicator_max}" />
		<ProductList />
	</div>
</div>

<style>

	
	:global(body)::-webkit-scrollbar {
			width: 6px;
		}

	/* Track */
	:global(body)::-webkit-scrollbar-track {
		background: #333333;
		border-radius: 12px;
	}

	/* Handle */
	:global(body)::-webkit-scrollbar-thumb {
		background-color: rgb(94, 94, 94);
		border-radius: 12px;
		transition: 0.4s linear all;
	}

	/* Handle on hover */
	:global(body)::-webkit-scrollbar-thumb:hover {
		background-color: #9fcdc0;
		transition: 0.4s linear all;
	}

	#top {
		height: 100%;
		width: 100%;
		justify-content: center;
        background-color: #232323;
		display:flex;
	}

    #subtop {
		width: 60%;
        display:flex;
        flex-direction: column;
		align-items: center;
    }
	@media only screen and (max-width: 900px) {
		#subtop {
			width : 100%;
		}
	}

	#feat-mb-text {
		width: 100%;
		background-image : url("src/libs/images/lornode_wide.png");
		background-repeat: no-repeat;
		background-size: cover;
  		border-radius: 18px;
		padding-top : 10%;
		padding-bottom: 24px;
	}

	#feat-mb-text > * {
		margin-left : 40px;
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

    .superTitle { 
        font-size: 350%;
        font-weight: 700;
        color: #CAFFC7;
    }

    .title{
		justify-content: center;
		font-size: 175%;
		font-weight: bold;
		color: white;
    }

    .subtitle{
        font-size: 100%;
        color: #B983FF;
    }

	#feat-mb-img {
		z-index: 1;
		width: 100%;
		min-height: 300px;
		height: 100%;
		object-fit: cover;
	}
</style>
