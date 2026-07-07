import type { Theme } from '$lib/client/theme';

export function readCssRgb(variable: string, fallback = '0, 0, 0'): string {
	if (typeof document === 'undefined') return fallback;

	const probe = document.createElement('span');
	probe.style.color = `hsl(var(${variable}))`;
	probe.style.display = 'none';
	document.documentElement.appendChild(probe);
	const rgb = getComputedStyle(probe).color;
	probe.remove();

	const match = rgb.match(/[\d.]+/g);
	if (!match || match.length < 3) return fallback;

	return `${Math.round(Number(match[0]))}, ${Math.round(Number(match[1]))}, ${Math.round(Number(match[2]))}`;
}

export function parseRgbString(rgb: string): { r: number; g: number; b: number } {
	const match = rgb.match(/[\d.]+/g);
	if (!match || match.length < 3) return { r: 0, g: 0, b: 0 };

	return {
		r: Math.round(Number(match[0])),
		g: Math.round(Number(match[1])),
		b: Math.round(Number(match[2]))
	};
}

export function particleColorCss(): string {
	return 'hsl(var(--foreground))';
}

export function particleBlendMode(theme: Theme): 'screen' | 'multiply' {
	return theme === 'dark' ? 'screen' : 'multiply';
}
