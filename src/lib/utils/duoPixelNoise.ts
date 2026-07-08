function encodeSvg(svg: string): string {
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function pixelNoiseLayer(id: string, baseFrequency: number, opacity: number, seed: number): string {
	return `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><filter id='${id}' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='${baseFrequency}' numOctaves='1' stitchTiles='stitch' seed='${seed}' result='n'/><feComponentTransfer in='n'><feFuncA type='discrete' tableValues='0 ${opacity}'/><feFuncR type='discrete' tableValues='0 1'/><feFuncG type='discrete' tableValues='0 1'/><feFuncB type='discrete' tableValues='0 1'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(%23${id})'/></svg>`;
}

/** Fine + coarse pixel noise layers for CSS background-image. */
export const duoPixelNoiseLayers = `${encodeSvg(pixelNoiseLayer('a', 0.38, 0.62, 4))}, ${encodeSvg(pixelNoiseLayer('b', 0.11, 0.48, 9))}`;

export const duoPixelNoiseSizes = '96px 96px, 160px 160px';

/**
 * Radial mask: transparent center, dense noise ring near the perimeter, fade to transparent outward.
 */
export const radialNoiseFadeMask =
	'radial-gradient(ellipse 92% 78% at 50% 50%, transparent 56%, rgba(0, 0, 0, 0.98) 70%, rgba(0, 0, 0, 0.42) 86%, transparent 100%)';

export const duoPixelNoiseCssVars = {
	'--gg-noise-layers': duoPixelNoiseLayers,
	'--gg-noise-sizes': duoPixelNoiseSizes,
	'--gg-noise-fade-mask': radialNoiseFadeMask
} as const;
