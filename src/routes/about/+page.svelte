<script lang="ts">
    let currentSelection : number = 0;
</script>
<div class="text-white flex flex-col text-center mt-8">
	<span class="font-bold text-2xl">Alright, We need to talk.</span>
    <span class="text-xl">We know you have a lot of questions on how this works.<br/>
        So we curated some of them below.</span>
    <div class="bg-[#0B1213] mt-8 w-full flex justify-center">
        <div class="flex justify-center items-center w-[600px]">
            <div class="flex flex-col mb-4 mt-2">
                <button on:click={()=>{currentSelection=0;}} class="category" class:selected-category={currentSelection==0}>Vision</button>
                <button on:click={()=>{currentSelection=1;}} class="category" class:selected-category={currentSelection==1}>The Present</button>
                <button on:click={()=>{currentSelection=2;}} class="category" class:selected-category={currentSelection==2}>The Next</button>
                <button on:click={()=>{currentSelection=3;}} class="category" class:selected-category={currentSelection==3}>Origin</button>
                <button on:click={()=>{currentSelection=4;}} class="category" class:selected-category={currentSelection==4}>Questioning Practicality</button>
                <button on:click={()=>{currentSelection=5;}} class="category" class:selected-category={currentSelection==5}>Unveiling the Why</button>
                <button on:click={()=>{currentSelection=6;}} class="category" class:selected-category={currentSelection==6}>Risk of Purchase</button>
                <button on:click={()=>{currentSelection=7;}} class="category" class:selected-category={currentSelection==7}>Operational costs</button>
            </div>
            <div class="flex flex-[4] flex-col">content of tabs</div>
        </div>
    </div>
</div>

<style lang="postcss">
    
    .category{
        @apply mt-6 text-xl text-[#9D9D9D] font-semibold ease-linear transition-all duration-200;
    }

    .selected-category{
        @apply font-bold text-2xl bg-opacity-20 rounded-[38px] bg-black p-4 text-white
    }

</style>
