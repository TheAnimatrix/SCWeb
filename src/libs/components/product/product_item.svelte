<script>
	import no_img from '$libs/svg/no_img.svg';
	import AddCartIcon from 'virtual:icons/solar/cart-plus-line-duotone';
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


	const overlayStyle="";
</script>
<!-- svelte-ignore a11y-click-events-have-key-events -->

<a
	href={stock>0?href:"#"}
	class="relative product-top flex flex-col max-md:flex-[1_0_61%] max-lg:flex-[1_0_41%] max-xl:flex-[1_0_31%] flex-[1_0_21%] min-w-0 max-w-[600px] mt-[20px] rounded-lg bg-[#1a112e] transition-all duration-100 ease-out h-fit {stock>0 ? "" : overlayStyle}"
	on:click={stock>0?onClick:null}>
	{#if stock<=0}
		<div class="absolute inset-0 bg-gray-950 opacity-50 h-full w-full rounded-lg"></div>
	{/if}
	<img class="product-img h-[220px] object-cover rounded-t-lg" src={pic[0]??no_img} alt="product" />
	<div class="p-4 pb-1 min-h-0 flex flex-col">
		<div style="flex justify-between items-end">
			<div class="text-white font-bold text-3xl">{name}</div>
		</div>
		<div class="text-[#ffffffaa]">by {author}</div>
		<div
			class="description font-normal text-[110%] text-white text-ellipsis whitespace-pre-line pt-[8px]"
			style="word-wrap:break-word;"
		>
			{description}
		</div>
		<div class="flex overflow-y-hidden justify-between items-end mt-4">
			<div class="flex flex-col justify-end">
				{#if oldPrice != 0}
					<span class="text-gray-500 line-through text-lg font-medium -mb-2">₹{oldPrice}</span>
				{/if}
				<div class="flex items-end">
					<span class="text-white text-3xl font-bold">₹{newPrice}</span>
					{#if ratingCount > 0}
						<div class="font-[700] text-[#ff9b3d] pl-1">
							{rating}({ratingCount})
						</div>
					{/if}
				</div>
			</div>
			{#if stock>0}
				<AddCartIcon class="text-white text-3xl"/>
			{/if}
		</div>
	</div>
	<div class="w-full mt-2 h-[10px] justify-end flex-1">
		<div class="{infoColor} p-1 pl-4 pr-4 rounded-b-lg">
			{#if stock>0}
				<span><strong>{stock}</strong> in stock</span>
			{:else}
				<span>{info}</span>
			{/if}
		</div>
	</div>
</a>

<style>

	.product-top:hover{
  		transform: translateY(-5px);
  		transition: 0.2s ease-out;
  		box-shadow: 10px 10px 50px 10px rgba(0,0,0,.35);
		cursor: pointer;
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

</style>
