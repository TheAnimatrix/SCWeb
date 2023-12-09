<script>
	
    import BannerIndicator from "$libs/components/banner_indicator.svelte";
    import ProductImage from "$libs/images/lornode_pp.png";
    import CartIcon from "$libs/svg/add_to_cart_icon.svg";

    let indicator_cur = 0;
	let indicator_max = 5;

    let ItemQty = 0;

    let productB = {
        name : "Lorem",
        author : "Ipsum",
        price : "<s style='font-weight: 500;font-size: 140%;line-height: 110%;text-decoration-line: line-through;color: #959595;'>₹2699</s><br/><span style='font-weight: 700;font-size: 200%;line-height: 110%;color: #fdfbff;'><span style='font-size:50%;color:var(--accent-color-1)'>from </span>₹1499</span>",
        description : "Lorem ipsum dolor sit amet consectetur adipisicing elit. Perspiciatis, iste labore corruptiillo deserunt tempora expedita velit rem, totam omnis, quia ipsa. Nostrum quos asperiores, optio aliquam deserunt molestiae dignissimos.",
        info : "Out of stock",
        infoColor : ["#FF5C38", "#ffffff"],
        rating : 4.1,
        ratingCount : 3,
        accent1 : "#FF7A00",
        accent2 : "#FFCE85",
        accent3 : "#FF5C38"
    };

    export let data;
    console.log(data);
    productB.name=data.craft_name;
</script>

<!-- <ProductItem {...productB} onClick={()=>console.log("clicked")}/> -->

<div class="pp_body">
    <div class="pp_store">
        <div id="path_bar" class="store_tip">
            <p>Crafts/<b>{data.craft_name}</b></p>
        </div>
        <div class="product_hero">
            <div id="image_zone">
                <img id="product_image" src="{ProductImage}" alt="lornode">
                <span id="mob_nav">
                    <BannerIndicator curActive="{indicator_cur}" max="{indicator_max}" />
                </span>
            </div>
            <div id="info_zone">
                <div id="info_header">
                    <div id="feat-mb-rect">
                        <div class="title">Lornode V2</div>
                        <div class="subtitle">By Animatrix</div>
                    </div>
                </div>
                <div id="info_details">
                    <div id="quick_specs">
                        <p>LoRA + ESP8266 Done right.<br>Low quiescent current &lt;10uA<br>73x74 mm<br>TP4056 based charging w/ power path ...</p>
                    </div>
                    <div id="pricing">
                        <div id="sale_price">
                            <span id="before_sale">₹999</span><br>
                            <span id="after_sale">₹899</span><br>
                            <span id="ratings">4.2(28)</span>
                        </div>
                        <div id="sale_info">
                            Launch OFFER!
                        </div>
                    </div>
                    <div id="purchase">
                        <div class="p_button qty_chg">-</div>
                        <div class="p_button" id="qty_show">{ItemQty}</div>
                        <div class="p_button qty_chg">+</div>
                        <div class="p_button" id="add_to_cart"><img src="{CartIcon}" alt="add to cart" id="add_to_cart_icon"></div>
                    </div>
                </div>
            </div>
        </div>
        <div id="image_nav" class="store_tip">
            <BannerIndicator curActive="{indicator_cur}" max="{indicator_max}" />
        </div>
    </div>
    <br>
    <div class="pp_details">

    </div>
</div>

<style>

    #add_to_cart_icon{
        height: 85%;
        widows: auto;
    }

    .p_button{
        display: flex;
        height: 2.0em;
        width: 2.0em;
        padding: 0.2em;
        align-items: center;
        justify-content: center;
        color: #FFFFFF;
        font-size: large;
    }

    .qty_chg{
        background-color: #343434;
        font-weight: bold;
        cursor: pointer;
    }

    .qty_chg:hover{
        background-color: #626262;
    }

    #qty_show{
        background-color: #343434;
        border-left: 2px solid #2A2A2A;
        border-right: 2px solid #2A2A2A;
    }

    #add_to_cart{
        background-color: #7D17FF;
    }

    #purchase{
        margin-top: 1em;
        display: flex;
        flex-direction: row;
        padding-left: 15px;
    }

    #before_sale{
        color: #959595;
        text-decoration: line-through;
        font-size: 90%;
        font-weight: 500;
    }

    #after_sale{
        color: #FDFBFF;
        font-size: 130%;
        font-weight: bold;
    }

    #ratings{
        color: #CC7A00;
        font-size: 85%;
        font-weight: 700;
    }

    #sale_price{
        flex: 1;
    }

    #sale_info{
        flex: 1;
        height: 55%;
        display: flex;
        color: #FFFFFF;
        font-size: 180%;
        font-weight: bolder;
        background: rgb(255,122,0);
        background: linear-gradient(93deg, rgba(255,122,0,1) 62%, rgba(217,65,119,1) 100%);
        text-align: center;
        justify-content: center;
        padding-top: 2%;
        padding-bottom: 2%;
    }

    #pricing{
        display: flex;
        padding-left: 15px;
        flex-direction: row;
        height: fit-content;
    }

    #quick_specs{
        padding-left: 15px;
        color: #FFFFFF;
        font-family: figtree;
        font-weight: 100;
        font-size: 90%;
    }

    #mob_nav{
        display: none;
    }

    #info_header{
        flex: 1;
        margin-bottom: 0.3em;
    }

    #info_details{
        flex: 4;
        border-style: solid;
        border-left: 5px;
        border-right: 5px;
        border-color: #9039FF;
        margin-top: 0.3em;
        background-color: #2C2C2C;
        display: flex;
        flex-direction: column;
    }

    #info_zone{
        flex: 1;
        height: 100%  ;
        display: flex;
        flex-direction: column;
        margin-left: 0.3em;
    }

    #image_zone{
        flex: 1;
        margin-right: 0.3em;
    }

    #product_image{
        width: 100%;
        min-height: 100%;
    }

    .product_hero{
        height: fit-content;
        width: 100%;
        display: flex;
        flex-direction: row;
    }
    
    #path_bar{
        color: #B8B8B8;
    }

    #path_bar b{
        color: #FFFFFF;
    }

    .pp_store {
        width: 75%;
        height: fit-content;
        margin-left: auto;
        margin-right: auto;
        display: flex;
        flex-direction: column;
    }

    .pp_details {
        width: 75%;
        height: 30em;
        background-color: yellow;
        margin-left: auto;
        margin-right: auto;
    }

	#feat-mb-rect {
		background: #000000;
		border-width: 2px 2px 13px 2px;
		border-style: solid;
		border-color: #ffeeee;
		padding: 15px 30px 15px 50px;
	}

    .title{
		justify-content: center;
		font-size: 175%;
		font-weight: bold;
		color: white;
    }

    .subtitle{
        font-size: 150%;
        color: #9039FF;
        font-weight: bold;
    }
</style>