import type { RequestHandler } from './$types';
import { productPath } from '$lib/seo/product';
import { getSiteUrl } from '$lib/seo/site';
import { makerStorefrontPath } from '$lib/utils/reservedUsernames';

interface BrowseProduct {
	id: string;
	name: string;
	created_at?: string;
}

interface BrowseResponse {
	products: BrowseProduct[];
	totalPages: number;
}

interface StorefrontListResponse {
	storefronts?: Array<{ handle: string; published_at: string | null }>;
}

const STATIC_ROUTES: { path: string; changefreq: string; priority: string }[] = [
	{ path: '/', changefreq: 'daily', priority: '1.0' },
	{ path: '/crafts', changefreq: 'daily', priority: '0.9' },
	{ path: '/crafting', changefreq: 'monthly', priority: '0.8' },
	{ path: '/3dp-portal', changefreq: 'weekly', priority: '0.8' },
	{ path: '/policy', changefreq: 'monthly', priority: '0.5' }
];

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function urlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: string): string {
	const lines = [`  <url>`, `    <loc>${escapeXml(loc)}</loc>`];
	if (lastmod) lines.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
	if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
	if (priority) lines.push(`    <priority>${priority}</priority>`);
	lines.push('  </url>');
	return lines.join('\n');
}

async function fetchProductPages(fetchFn: typeof fetch): Promise<BrowseProduct[]> {
	const products: BrowseProduct[] = [];
	let page = 1;
	let totalPages = 1;

	while (page <= totalPages) {
		const response = await fetchFn(`/api/catalog/browse?filter=all&sort=newest&page=${page}`);
		if (!response.ok) break;

		const data = (await response.json()) as BrowseResponse;
		products.push(...(data.products ?? []));
		totalPages = data.totalPages ?? 1;
		page += 1;
	}

	return products;
}

export const prerender = false;

export const GET: RequestHandler = async ({ fetch, url }) => {
	const siteUrl = getSiteUrl(url.origin);
	const entries: string[] = [];

	for (const route of STATIC_ROUTES) {
		entries.push(
			urlEntry(`${siteUrl}${route.path}`, undefined, route.changefreq, route.priority)
		);
	}

	try {
		const products = await fetchProductPages(fetch);
		for (const product of products) {
			const path = productPath(product);
			const lastmod = product.created_at
				? new Date(product.created_at).toISOString().slice(0, 10)
				: undefined;
			entries.push(urlEntry(`${siteUrl}${path}`, lastmod, 'weekly', '0.7'));
		}
	} catch (error) {
		console.error('[sitemap] failed to fetch products:', error);
	}

	try {
		const response = await fetch('/api/makers/storefronts');
		if (response.ok) {
			const data = (await response.json()) as StorefrontListResponse;
			for (const storefront of data.storefronts ?? []) {
				const lastmod = storefront.published_at
					? new Date(storefront.published_at).toISOString().slice(0, 10)
					: undefined;
				entries.push(
					urlEntry(
						`${siteUrl}${makerStorefrontPath(storefront.handle)}`,
						lastmod,
						'weekly',
						'0.8'
					)
				);
			}
		}
	} catch (error) {
		console.error('[sitemap] failed to fetch storefronts:', error);
	}

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
