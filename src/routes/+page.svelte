<script>
	import BannerIndicator from "./banner_indicator.svelte";
	import ProductList from "./product_list.svelte";
	import lornode_wide from "$libs/images/lornode_wide.png";
	import {goto} from "$app/navigation"

	let indicator_cur = 0;
	let indicator_max = 5;

	let products = [];
	let productA = {
		name: 'Lornode V2',
		author: 'Animatrix',
		description: `LoRA + ESP8266 Done right.
        Low quiescent current <10uA.
        73x43 mm.
        TP4056 based charging & power path.`,
		price:
			"<s style='font-weight: 500;font-size: 140%;line-height: 110%;text-decoration-line: line-through;color: #959595;'>₹899</s><br/><span style='font-weight: 700;font-size: 200%;line-height: 110%;color: #fdfbff;'>₹999</span>",
		info: '<strong>8</strong> in stock',
		infoColor: ['#ffffff', '#000000'],
		rating: 4.5,
		ratingCount: 20,
		pic: lornode_wide,
		accent1: '#8539FF',
		accent2: '#2039FF',
		accent3: '#9038FF'
	};

	let productB = {
		name: 'Lorem',
		author: 'Ipsum',
		price:
			"<s style='font-weight: 500;font-size: 140%;line-height: 110%;text-decoration-line: line-through;color: #959595;'>₹2699</s><br/><span style='font-weight: 700;font-size: 200%;line-height: 110%;color: #fdfbff;'><span style='font-size:50%;color:var(--accent-color-1)'>from </span>₹1499</span>",
		description:
			'Lorem ipsum dolor sit amet consectetur adipisicing elit. Perspiciatis, iste labore corruptiillo deserunt tempora expedita velit rem, totam omnis, quia ipsa. Nostrum quos asperiores, optio aliquam deserunt molestiae dignissimos.',
		info: 'Out of stock',
		infoColor: ['#FF5C38', '#ffffff'],
		rating: 4.1,
		ratingCount: 3,
		accent1: '#FF7A00',
		accent2: '#FFCE85',
		accent3: '#FF5C38'
	};

	for (let i=0;i<25;i++)
	{
		if (i%2 == 0)
			products.push(productA)
		else
			products.push(productB)
	}
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
		<ProductList products={products} onClick={(i,product)=>{goto(`/${product.name.replaceAll(" ","_")}/craft/item=${i}`)}}/>
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
		transition: 0.4s linear ease-in;
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
		width: 65%;
        display:flex;
        flex-direction: column;
		align-items: center;
    }
	@media only screen and (max-width: 1260px) {
		#subtop {
			width : 95%;
		}
	}

	#feat-mb-text {
		width: 100%;
		background-image : url("$libs/images/lornode_wide.png");
		background-position: center; 
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
</style>
