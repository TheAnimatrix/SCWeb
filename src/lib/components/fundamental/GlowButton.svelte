<!-- @migration-task Error while migrating Svelte code: $$props is used together with named props in a way that cannot be automatically migrated. -->
<script lang="ts">
    import { spring } from 'svelte/motion'
    import { cubicOut } from 'svelte/easing'

    interface Props {
        buttonBgColor?: string;
        borderColor?: string;
        hoverCheckout?: string;
        glowCheckout?: string;
        pulseEffect?: boolean;
        rippleColor?: string;
        hoverScale?: number;
        pressScale?: number;
        disabled?: boolean;
        class?: string;
    }
    let {
        buttonBgColor = 'bg-scblued3',
        borderColor = 'border-scblue',
        hoverCheckout = '[box-shadow:0px_12px_40px_8px_hsla(196.33,_100%,_73.14%,_0.75)]',
        glowCheckout = '[box-shadow:0px_9px_34px_6px_hsla(196.33,_100%,_73.14%,_0.4)]',
        pulseEffect = true,
        rippleColor = 'rgba(255,255,255,0.3)',
        hoverScale = 1.02,
        pressScale = 0.97,
        disabled = false,
        class: className = '',
        ...rest
    }: Props & Record<string, any> = $props();

    // State
    let checkoutHover = $state(false);
    let hoverable = $derived(!disabled);
    let isPressed = $state(false);
    let scale = spring(1, {
        stiffness: 0.3,
        damping: 0.5,
        precision: 0.001
    });
    let ripples = $state<{x: number, y: number, size: number}[]>([]);

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

    function handleClick(e: MouseEvent) {
        createRipple(e);
        scale.set(pressScale);
        isPressed = true;
        setTimeout(() => {
            scale.set(hoverable ? hoverScale : 1);
            isPressed = false;
        }, 150);
        // Call parent onclick if provided
        rest.onclick?.(e);
    }
    function handleMouseOver() {
        if (hoverable && !isPressed) {
            checkoutHover = true;
            scale.set(hoverScale);
        }
    }
    function handleMouseLeave() {
        checkoutHover = false;
        if (!isPressed) scale.set(1);
    }
</script>

<button
    disabled={disabled}
    onclick={handleClick}
    onfocus={() => {}}
    onmouseover={handleMouseOver}
    onmouseleave={handleMouseLeave}
    style={`transform: scale(${scale})`}
    class={`relative font-bold text-xl overflow-hidden ${buttonBgColor} rounded-lg shadow-none hover:shadow-lg transition-all duration-300 disabled:opacity-30 ${pulseEffect ? 'animate-pulse' : ''} ${className}`}
    {...rest}
>
    {#each ripples as ripple}
        <!-- svelte-ignore element_invalid_self_closing_tag -->
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
        class={`animate_base mx-4 ${borderColor} ${checkoutHover ? hoverCheckout : glowCheckout} transition-all duration-300`}
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