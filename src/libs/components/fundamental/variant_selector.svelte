<script>
	export let values = ['V1', 'V2'];
	import ArrowDown from 'virtual:icons/iconamoon/arrow-down-2';
</script>

<div>
	<div class="flex flex-col bg-scpurpled3 w-fit min-w-[50%] rounded-xl">
		<div class="top_line w-[50%] self-start ml-4" />
		<div class="flex justify-between items-center p-2 pl-4 opacity-50">
			<div>
                <span>Select</span>
                <select>
                    <option>{values[0]}</option>
                    <option>{values[1]}</option>
                </select>
			</div>
			<div>
				<ArrowDown class="text-xl"/>
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	.top_line {
		height: 1.5px;
		border-radius: 2px;
		background: linear-gradient(270deg, #9350e9 5.55%, #b378ff 91.01%, #b378ff 91.01%);
		box-shadow: 0px 9px 34px 6px rgba(224, 157, 255, 0.31);
	}
</style>
