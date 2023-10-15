<script>
	import { each } from "svelte/internal";
    export let curActive;
    export let max;
    let i = 0;
    const prevIndicator = function (){
        console.log("clicked prev " + (i++));
        curActive = curActive>0 ? curActive-1 : curActive;
    }
    
    const nextIndicator = function (){
        curActive = curActive<max-1 ? curActive+1 : curActive;
    }
</script>

<div id="feat-mb-indicator">
    <button on:click={prevIndicator} class="btn-clear">
	    <img src="src/libs/svg/arrow_left.svg" alt="<" style="margin-right: 8px;"/>
    </button>
    {#each Array(max) as _, i(i)}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class:sq-indicator-active="{curActive === i}" class="sq-indicator"  on:click="{()=>{curActive=i}}"/>
    {/each}
    <button on:click={nextIndicator} class="btn-clear">
	    <img src="src/libs/svg/arrow_left.svg" style="transform: rotate(180deg);" alt=">" />
    </button>
</div>

<style>
    .btn-clear {
        background: none;
        color: inherit;
        border: none;
        padding: 0;
        font: inherit;
        cursor: pointer;
        outline: inherit;
    }

    #feat-mb-indicator {
        width: 100%;
        color: white;
        margin-top: 16px;
        display:flex;
        align-items: center;
    }

    .sq-indicator{
        box-sizing: border-box;
        width: 2%;
        height: 12px;
        background: #B950FF;
        margin-right: 8px;
        transition: 0.2s linear all;
    }

    .sq-indicator:not(.sq-indicator-active):hover{
        box-sizing: border-box;
        width: 2%;
        height: 12px;
        background: #e2b6ff;
        margin-right: 8px;
        transition: 0.2s linear all;
    }
    .sq-indicator-active{
        width: 7%;
        height: 12px;
        background: #ffffff;
        margin-right: 8px;
        transition: 0.2s linear all;
    }
</style>