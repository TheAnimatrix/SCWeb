import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const LOGO_SIZE = 88;
const LOGO_PADDING = 28;

let logoBuffer: Buffer | null = null;

async function getLogoBuffer(): Promise<Buffer> {
	if (logoBuffer) return logoBuffer;
	logoBuffer = await readFile(join(process.cwd(), 'static/pwa/pwa-512.png'));
	return logoBuffer;
}

function escapeXml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function truncateText(text: string, maxLength: number): string {
	const trimmed = text.trim();
	if (trimmed.length <= maxLength) return trimmed;
	return `${trimmed.slice(0, maxLength - 1).trim()}…`;
}

async function brandedFallbackImage(productName: string): Promise<Buffer> {
	const logo = await sharp(await getLogoBuffer()).resize(LOGO_SIZE, LOGO_SIZE).png().toBuffer();
	const title = escapeXml(truncateText(productName, 72));

	const titleSvg = Buffer.from(`<svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#0f172a"/>
				<stop offset="100%" stop-color="#114239"/>
			</linearGradient>
		</defs>
		<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#bg)"/>
		<text x="600" y="430" text-anchor="middle" fill="#ffffff" font-family="system-ui,Segoe UI,sans-serif" font-size="52" font-weight="700">${title}</text>
		<text x="600" y="500" text-anchor="middle" fill="#92cec0" font-family="system-ui,Segoe UI,sans-serif" font-size="28">Selfcrafted India</text>
	</svg>`);

	return sharp(titleSvg)
		.composite([{ input: logo, top: 150, left: Math.round((OG_WIDTH - LOGO_SIZE) / 2) }])
		.jpeg({ quality: 85 })
		.toBuffer();
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
		if (!response.ok) return null;
		const arrayBuffer = await response.arrayBuffer();
		return Buffer.from(arrayBuffer);
	} catch {
		return null;
	}
}

export async function generateProductOgImage(
	productName: string,
	imageUrl?: string
): Promise<Buffer> {
	const productImageBuffer = imageUrl ? await fetchImageBuffer(imageUrl) : null;
	if (!productImageBuffer) {
		return brandedFallbackImage(productName);
	}

	const [productLayer, logo] = await Promise.all([
		sharp(productImageBuffer)
			.resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' })
			.toBuffer(),
		sharp(await getLogoBuffer()).resize(LOGO_SIZE, LOGO_SIZE).png().toBuffer()
	]);

	const overlaySvg = Buffer.from(`<svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
				<stop offset="55%" stop-color="rgba(0,0,0,0)"/>
				<stop offset="100%" stop-color="rgba(0,0,0,0.55)"/>
			</linearGradient>
		</defs>
		<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#shade)"/>
	</svg>`);

	const badgeSvg = Buffer.from(`<svg width="${LOGO_SIZE + 24}" height="${LOGO_SIZE + 24}" xmlns="http://www.w3.org/2000/svg">
		<rect width="${LOGO_SIZE + 24}" height="${LOGO_SIZE + 24}" rx="18" fill="rgba(255,255,255,0.92)"/>
	</svg>`);

	return sharp(productLayer)
		.composite([
			{ input: overlaySvg, top: 0, left: 0 },
			{ input: badgeSvg, top: OG_HEIGHT - LOGO_SIZE - LOGO_PADDING - 12, left: OG_WIDTH - LOGO_SIZE - LOGO_PADDING - 12 },
			{
				input: logo,
				top: OG_HEIGHT - LOGO_SIZE - LOGO_PADDING,
				left: OG_WIDTH - LOGO_SIZE - LOGO_PADDING
			}
		])
		.jpeg({ quality: 85 })
		.toBuffer();
}
