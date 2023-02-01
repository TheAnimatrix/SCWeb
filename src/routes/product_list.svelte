<script>
	import ProductItem from "./product_item.svelte";

    let productA = {
        name : "Lornode V2",
        author : "Animatrix",
        description : `LoRA + ESP8266 Done right.
        Low quiescent current <10uA.
        73x43 mm.
        TP4056 based charging & power path.`,
        price : "<s style='font-weight: 500;font-size: 140%;line-height: 110%;text-decoration-line: line-through;color: #959595;'>₹899</s><br/><span style='font-weight: 700;font-size: 200%;line-height: 110%;color: #fdfbff;'>₹999</span>",
        info : "<strong>8</strong> in stock",
        infoColor : ["#ffffff", "#000000"],
        rating : 4.5,
        ratingCount : 20,
        pic : "src/libs/images/lornode_wide.png",
        accent1 : "#8539FF",
        accent2 : "#2039FF",
        accent3 : "#9038FF"
    };

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

</script>

<div class="main">
    <ProductItem class="rmm" {...productA} />
    <ProductItem {...productB} />
    <ProductItem {...productA} />
    <ProductItem {...productB} />
    <ProductItem {...productA} />
    <ProductItem {...productB} />
    <ProductItem {...productA} />
    <ProductItem {...productB} />
</div>

<style>
    .main{
        display : flex;
        flex-wrap: wrap;
        justify-content: center;
        gap : 20px;
    }

</style>