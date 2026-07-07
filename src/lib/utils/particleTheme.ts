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

export type Rgb = { r: number; g: number; b: number };

export const PARTICLE_ACCENT_PALETTE: readonly Rgb[] = [
	{ r: 255, g: 0, b: 255 },
	{ r: 255, g: 45, b: 180 },
	{ r: 200, g: 60, b: 255 },
	{ r: 140, g: 80, b: 255 },
	{ r: 0, g: 220, b: 255 },
	{ r: 255, g: 175, b: 45 },
	{ r: 255, g: 95, b: 55 }
];

export function pickAccentColor(): Rgb {
	return PARTICLE_ACCENT_PALETTE[Math.floor(Math.random() * PARTICLE_ACCENT_PALETTE.length)];
}

export function rollAccentParticle(chance = 0.07): { isAccent: boolean; accentRgb: Rgb | null } {
	const isAccent = Math.random() < chance;
	return { isAccent, accentRgb: isAccent ? pickAccentColor() : null };
}

export function particleDrawRgb(base: Rgb, accentRgb: Rgb | null, isAccent: boolean): Rgb {
	return isAccent && accentRgb ? accentRgb : base;
}

export function rgbaString(rgb: Rgb, alpha: number): string {
	return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function accentIntensity(alpha: number, floor = 0.12): number {
	return Math.min(0.72, Math.max(alpha, floor) * 0.95);
}

/** Crisp square halo in the same color — rings only, core stays sharp on the base layer. */
export function drawGlowRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	rgb: Rgb,
	alpha: number
) {
	const intensity = accentIntensity(alpha);

	const rings = [
		{ dist: 2, a: 0.1 },
		{ dist: 1, a: 0.22 }
	];

	for (const ring of rings) {
		for (let dx = -ring.dist; dx <= ring.dist; dx++) {
			for (let dy = -ring.dist; dy <= ring.dist; dy++) {
				if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring.dist) continue;

				ctx.fillStyle = rgbaString(rgb, intensity * ring.a);
				ctx.fillRect(x + dx * width, y + dy * height, width, height);
			}
		}
	}
}

/** Halo only — draw the crisp core on the base layer separately. */
export function drawGlowCircle(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	rgb: Rgb,
	alpha: number
) {
	const glowRadius = radius * 3.5;
	const intensity = accentIntensity(alpha, 0.15);

	const gradient = ctx.createRadialGradient(x, y, radius * 0.6, x, y, glowRadius);
	gradient.addColorStop(0, rgbaString(rgb, intensity * 0.32));
	gradient.addColorStop(0.35, rgbaString(rgb, intensity * 0.14));
	gradient.addColorStop(1, rgbaString(rgb, 0));

	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
	ctx.fill();
}

/** Same-color radial glow for large soft blobs — draw on a screen-blended layer. */
export function drawGlowRadialBlob(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	rgb: Rgb,
	alpha: number
) {
	const glowRadius = radius * 1.25;
	const intensity = accentIntensity(alpha, 0.1);

	const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
	gradient.addColorStop(0, rgbaString(rgb, intensity));
	gradient.addColorStop(0.35, rgbaString(rgb, intensity * 0.35));
	gradient.addColorStop(0.65, rgbaString(rgb, intensity * 0.1));
	gradient.addColorStop(1, rgbaString(rgb, 0));

	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
	ctx.fill();
}
