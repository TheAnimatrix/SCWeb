<script lang="ts">
    import { createEventDispatcher } from 'svelte'
    import { spring } from 'svelte/motion'
    import { cubicOut } from 'svelte/easing'
    
    let checkoutHover = false;
    let hoverable = true;
    let isPressed = false;
    
    // More responsive spring animation
    let scale = spring(1, {
        stiffness: 0.3,
        damping: 0.5,
        precision: 0.001
    });

    // Enhanced ripple effect
    let ripples: {x: number, y: number, size: number}[] = [];
    
    export let buttonBgColor = "bg-scblued3";
    export let borderColor = "border-scblue"; 
    export let hoverCheckout = `[box-shadow:0px_12px_40px_8px_hsla(196.33,_100%,_73.14%,_0.75)]`;
    export let glowCheckout = `[box-shadow:0px_9px_34px_6px_hsla(196.33,_100%,_73.14%,_0.4)]`;
    export let pulseEffect = true;
    export let rippleColor = "rgba(255,255,255,0.3)";
    export let hoverScale = 1.02;
    export let pressScale = 0.97;
    
    $: hoverable = !$$props.disabled;
    const dispatch = createEventDispatcher();

    function createRipple(e: MouseEvent) {
        const button = e.currentTarget as HTMLButtonElement;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const size = Math.max(rect.width, rect.height) * 2;
        
        ripples = [...ripples, {x, y, size}];
        setTimeout(() => {
            ripples = ripples.slice(1);
        }, 1000);
    }
</script>

<button
    {...$$props}
    on:click={(e) => {
        dispatch('click');
        createRipple(e);
        scale.set(pressScale);
        isPressed = true;
        setTimeout(() => {
            scale.set(hoverable && checkoutHover ? hoverScale : 1);
            isPressed = false;
        }, 150);
    }}
    on:focus={() => {}}
    on:mouseover={() => {
        if (hoverable && !isPressed) {
            checkoutHover = true;
            scale.set(hoverScale);
        }
    }}
    on:mouseleave={() => {
        checkoutHover = false;
        if (!isPressed) scale.set(1);
    }}
    style="transform: scale({$scale})"
    class="relative font-bold text-xl overflow-hidden {buttonBgColor} rounded-lg shadow-none hover:shadow-lg transition-all duration-300 disabled:opacity-30 {pulseEffect ? 'animate-pulse' : ''} {$$props.class}"
>
    {#each ripples as ripple}
        <span
            class="absolute rounded-full pointer-events-none"
            style="
                left: {ripple.x - ripple.size/2}px;
                top: {ripple.y - ripple.size/2}px;
                width: {ripple.size}px;
                height: {ripple.size}px;
                background: {rippleColor};
                transform: scale(0);
                animation: ripple 1s cubic-bezier(0.4, 0, 0.2, 1);
            "
        />
    {/each}
    
    <hr
        id="checkoutGlow"
        class="animate_base mx-4 {borderColor} {checkoutHover ? hoverCheckout : glowCheckout} transition-all duration-300"
    />
    <slot/>
</button>

<style>
    @keyframes ripple {
        to {
            transform: scale(1);
            opacity: 0;
        }
    }
</style>