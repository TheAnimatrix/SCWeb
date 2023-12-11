<script>
	import no_img from '$libs/svg/no_img.svg';
	export let name,
		author,
		description,
		oldPrice,
		newPrice,
		info,
		infoColor,
		rating,
		ratingCount,
		pic,
		stock,
		accent1,
		accent2,
		accent3;
	accent2 = accent2 ?? accent1;
	accent3 = accent3 ?? accent1;
	export let href;
	export let onClick;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<a
	href={href}
	class="product-top"
	style:--accent-color-1={accent1}
	style:--accent-color-2={accent2}
	style:--accent-color-3={accent3}
	on:click={onClick}
>
	<img class="product-img" src={pic[0]??no_img} alt="product" />
	<div class="content">
		<div style="display:flex;justify-content:space-between; align-items:flex-end;">
			<div class="title text-white font-bold text-3xl">{name}</div>
			{#if ratingCount > 0}
				<div class="rating">{rating}({ratingCount})</div>
			{/if}
		</div>
		<div class="subtitle">by {author}</div>
		<div
			class="description"
			style="text-overflow: ellipsis; word-wrap: break-word; white-space: pre-line;padding-top:8px;"
		>
			{description}
		</div>
		<div style="display:flex;overflow-y:hidden; justify-content:space-between; align-items:flex-end;">
			<div class="flex flex-col justify-end">
				{#if oldPrice != 0}
					<span class="text-gray-500 line-through text-lg font-medium mb-0">₹{oldPrice}</span>
				{/if}
				<span class="text-white text-3xl font-bold">₹{newPrice}</span>
			</div>

			<div class="w-full ml-2 mt-2">
				<div class="{infoColor} p-1 w-fit  float-right">
					{#if stock>0}
						<span><strong>{stock}</strong> in stock</span>
					{:else}
						<span>{info}</span>
					{/if}
				</div>
			</div>
		</div>
	</div>
</a>

<style>

    .rmm {
        margin-left : 0px;
    }

	.product-top:hover{
  		transform: translateY(-5px);
  		transition: 0.2s ease-out;
  		box-shadow: 10px 10px 50px 10px rgba(0,0,0,.35);
		cursor: pointer;
	}

	.product-top {
		display: flex;
		flex-direction: column;
        flex: 1 0 21%;
        min-width: 0;
        max-width: 600px;
		margin-top: 20px;
		border-width: 4px 0px 4px 0px;
		border-style: solid;
		border-top-color: var(--accent-color-2);
		border-bottom-color: var(--accent-color-3);
		background-color: #333333;
        height:fit-content;
 		transition: 0.1s ease-out;
	}
    
    @media only screen and (max-width: 1250px) {
        .product-top{
            flex: 1 0 31%;
        }
    }
    @media only screen and (max-width: 1160px) {
        .product-top{
            flex: 1 0 41%;
        }
    }
    @media only screen and (max-width: 700px) {
        .product-top{
            flex: 1 0 61%;
        }
    }


	.content {
		padding: 16px;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.product-img {
		height: 220px;
		object-fit: cover;
	}

	.rating {
		font-style: normal;
		font-weight: 700;
		font-size: 120%;
		line-height: 17px;
		color: #ffb800;
	}

	.subtitle {
		font-size: 130%;
		color: var(--accent-color-1);
	}

	.description {
		font-style: normal;
		font-weight: 400;
		font-size: 110%;
		color: #ffffff;
	}

	.description::-webkit-scrollbar {
		width: 6px;
	}

	/* Track */
	.description::-webkit-scrollbar-track {
		background: #333333;
		border-radius: 12px;
	}

	/* Handle */
	.description::-webkit-scrollbar-thumb {
		background-color: rgb(94, 94, 94);
		border-radius: 12px;
		transition: 0.4s linear all;
	}

	/* Handle on hover */
	.description::-webkit-scrollbar-thumb:hover {
		background-color: #cacaca;
		transition: 0.4s linear all;
	}

	.price {
		flex: 5;
		margin-top: 16px;
		margin-right: 20px;
	}
</style>
