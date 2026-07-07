import { cubicOut } from 'svelte/easing';
import type { FadeParams, FlyParams } from 'svelte/transition';

export const TAB_TRANSITION_DURATION = 220;
export const TAB_TRANSITION_OUT_DURATION = 150;

function prefersReducedMotion(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

export function getTabFlyIn(): FlyParams {
	if (prefersReducedMotion()) return { duration: 0 };
	return { y: 10, duration: TAB_TRANSITION_DURATION, easing: cubicOut };
}

export function getTabFadeOut(): FadeParams {
	if (prefersReducedMotion()) return { duration: 0 };
	return { duration: TAB_TRANSITION_OUT_DURATION };
}

export function getTabFadeIn(): FadeParams {
	if (prefersReducedMotion()) return { duration: 0 };
	return { duration: TAB_TRANSITION_DURATION };
}
