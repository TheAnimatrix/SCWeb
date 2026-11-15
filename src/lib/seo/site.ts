import { env } from '$env/dynamic/public';

export const SITE_NAME = 'Selfcrafted India';
export const SITE_TAGLINE = 'Marketplace for indie hardware makers in India';
export const DEFAULT_DESCRIPTION =
	'Buy hardware made by independent makers in India: finished products, spare parts and flea-market finds. Or get a model 3D printed by a maker with a printer.';
export const DEFAULT_OG_IMAGE = '/images/og-default.jpg';
export const DEFAULT_OG_IMAGE_ALT =
	'Line drawing of a small electronics board with an antenna next to an open shipping box.';
export const TWITTER_HANDLE = '@selfcrafted_in';
export const SUPPORT_EMAIL = 'support@selfcrafted.in';

const NOINDEX_PREFIXES = [
	'/cart',
	'/checkout',
	'/summary',
	'/user',
	'/3dp-portal/maker',
	'/3dp-portal/user'
] as const;

export function getSiteUrl(fallbackOrigin?: string): string {
	const configured = env.PUBLIC_SITE_URL?.replace(/\/$/, '');
	if (configured) return configured;

	const vercel = env.PUBLIC_VERCEL_URL?.replace(/\/$/, '');
	if (vercel) return vercel.startsWith('http') ? vercel : `https://${vercel}`;

	if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, '');
	return 'https://selfcrafted.in';
}

export function absoluteUrl(path: string, origin?: string): string {
	if (path.startsWith('http://') || path.startsWith('https://')) {
		return path;
	}

	const base = origin ?? getSiteUrl();
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${base}${normalizedPath}`;
}

export function isNoIndexPath(pathname: string): boolean {
	return NOINDEX_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
}

export function formatTitle(pageTitle?: string): string {
	if (!pageTitle) return SITE_NAME;
	return `${pageTitle} | ${SITE_NAME}`;
}
