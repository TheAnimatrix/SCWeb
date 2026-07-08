import { cubicOut } from 'svelte/easing';
import { fade, fly } from 'svelte/transition';
import type { FadeParams, FlyParams, TransitionConfig } from 'svelte/transition';

const SHEET_DURATION = 320;
const BACKDROP_DURATION = 220;

function prefersReducedMotion(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

export function sheetBackdropIn(
	node: Element,
	params: FadeParams = {}
): TransitionConfig {
	if (prefersReducedMotion()) return { duration: 0 };
	return fade(node, { duration: BACKDROP_DURATION, ...params });
}

export function sheetBackdropOut(
	node: Element,
	params: FadeParams = {}
): TransitionConfig {
	if (prefersReducedMotion()) return { duration: 0 };
	return fade(node, { duration: BACKDROP_DURATION, ...params });
}

export function sheetPanelIn(
	node: HTMLElement,
	params: FlyParams = {}
): TransitionConfig {
	if (prefersReducedMotion()) return { duration: 0 };

	const distance = node.getBoundingClientRect().height || window.innerHeight * 0.85;
	return fly(node, {
		y: distance,
		duration: SHEET_DURATION,
		easing: cubicOut,
		...params
	});
}

export function sheetPanelOut(
	node: HTMLElement,
	params: FlyParams = {}
): TransitionConfig {
	if (prefersReducedMotion()) return { duration: 0 };

	const distance = node.getBoundingClientRect().height || window.innerHeight * 0.85;
	return fly(node, {
		y: distance,
		duration: SHEET_DURATION,
		easing: cubicOut,
		...params
	});
}
