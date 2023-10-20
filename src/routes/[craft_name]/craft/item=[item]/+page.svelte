<script>
	import ProductItem from "../../../product_item.svelte";
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
    console.log(data)
    productB.name=data.craft_name;
</script>

<!-- <ProductItem {...productB} onClick={()=>console.log("clicked")}/> -->

<div class="pp_body">
    <div class="pp_store">
        
    </div>
    <br>
    <div class="pp_details">

    </div>
</div>

<style>
    .pp_store {
        width: 75%;
        height: 30em;
        background-color: red;
        margin-left: auto;
        margin-right: auto;
    }
    .pp_details {
        width: 75%;
        height: 30em;
        background-color: yellow;
        margin-left: auto;
        margin-right: auto;
    }
</style>