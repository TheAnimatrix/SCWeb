import type { Product } from '$lib/types/product';
import {
	absoluteUrl,
	DEFAULT_DESCRIPTION,
	DEFAULT_OG_IMAGE,
	DEFAULT_OG_IMAGE_ALT,
	formatTitle,
	getSiteUrl,
	SITE_NAME,
	SITE_TAGLINE
} from './site';
import {
	productAvailability,
	productDescription,
	productImageUrl,
	productOgImageUrl,
	productPath,
	productUrl
} from './product';

export interface SeoMeta {
	title?: string;
	description?: string;
	canonical?: string;
	image?: string;
	imageAlt?: string;
	imageWidth?: number;
	imageHeight?: number;
	type?: 'website' | 'product' | 'article';
	noindex?: boolean;
	keywords?: string[];
	price?: number;
	priceCurrency?: string;
	publishedTime?: string;
	author?: string;
}

export const homeSeo: SeoMeta = {
	title: SITE_NAME,
	description: DEFAULT_DESCRIPTION,
	type: 'website',
	keywords: [
		'indie hardware',
		'maker marketplace India',
		'electronics makers',
		'3D printing India',
		'Selfcrafted'
	]
};

export const craftsSeo: SeoMeta = {
	title: 'Shop',
	description:
		'Hardware, spare parts and flea-market finds from independent makers in India. Filter by category, price and tag.',
	type: 'website',
	keywords: ['maker products', 'hardware marketplace', 'spares', 'components']
};

export const craftingSeo: SeoMeta = {
	title: 'Sell on Selfcrafted',
	description:
		'Sell your hardware on Selfcrafted India. Apply as a maker, set up a shop page, and list products, spares or surplus parts.',
	type: 'website'
};

export const portalSeo: SeoMeta = {
	title: '3D printing',
	description:
		'Upload an STL, choose a material and print settings, and ask a maker in India for a quote.',
	type: 'website',
	keywords: ['3D printing India', 'on-demand printing', 'STL printing']
};

export const policySeo: SeoMeta = {
	title: 'Policies',
	description:
		'Shipping, refunds, buyer protection, privacy, terms and contact details for Selfcrafted India.',
	type: 'website',
	noindex: false
};

export function resolveSeo(
	meta: SeoMeta = {},
	origin?: string
): Required<Pick<SeoMeta, 'title' | 'description' | 'type' | 'noindex'>> & {
	canonical: string;
	image: string;
	imageAlt: string;
	imageWidth: number;
	imageHeight: number;
	keywords?: string[];
	price?: number;
	priceCurrency?: string;
	publishedTime?: string;
	author?: string;
} {
	const siteUrl = origin ?? getSiteUrl();
	const title = formatTitle(meta.title === SITE_NAME ? undefined : meta.title);
	const description = meta.description ?? DEFAULT_DESCRIPTION;
	const canonical = meta.canonical ?? siteUrl;
	const image = meta.image
		? absoluteUrl(meta.image, siteUrl)
		: absoluteUrl(DEFAULT_OG_IMAGE, siteUrl);

	return {
		title,
		description,
		canonical,
		image,
		imageAlt: meta.imageAlt ?? (meta.image ? SITE_TAGLINE : DEFAULT_OG_IMAGE_ALT),
		imageWidth: meta.imageWidth ?? 1200,
		imageHeight: meta.imageHeight ?? 630,
		type: meta.type ?? 'website',
		noindex: meta.noindex ?? false,
		keywords: meta.keywords,
		price: meta.price,
		priceCurrency: meta.priceCurrency,
		publishedTime: meta.publishedTime,
		author: meta.author
	};
}

export function productSeo(product: Product, origin?: string): SeoMeta {
	const siteUrl = origin ?? getSiteUrl();
	const directImage = productImageUrl(product, siteUrl);
	const brandedImage = productOgImageUrl(product, siteUrl);

	return {
		title: product.name,
		description: productDescription(product),
		canonical: productUrl(product, siteUrl),
		image: directImage ?? brandedImage,
		imageAlt: product.name,
		imageWidth: 1200,
		imageHeight: 630,
		type: 'product',
		price: product.price.new,
		priceCurrency: 'INR',
		keywords: product.tags?.map((tag) => tag.tag).filter(Boolean)
	};
}

export function productJsonLd(product: Product, origin?: string) {
	const siteUrl = origin ?? getSiteUrl();
	const image = productImageUrl(product, siteUrl);
	const rating = product.rating;

	return {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: product.name,
		description: productDescription(product, 500),
		sku: product.id,
		url: productUrl(product, siteUrl),
		...(image ? { image: [image] } : {}),
		brand: {
			'@type': 'Brand',
			name: product.author ?? SITE_NAME
		},
		offers: {
			'@type': 'Offer',
			url: productUrl(product, siteUrl),
			priceCurrency: 'INR',
			price: product.price.new,
			availability: `https://schema.org/${productAvailability(product)}`
		},
		...(rating && rating.count > 0
			? {
					aggregateRating: {
						'@type': 'AggregateRating',
						ratingValue: rating.rating,
						reviewCount: rating.count
					}
				}
			: {})
	};
}

export function breadcrumbJsonLd(items: { name: string; path?: string }[], origin?: string) {
	const siteUrl = origin ?? getSiteUrl();

	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			...(item.path ? { item: absoluteUrl(item.path, siteUrl) } : {})
		}))
	};
}

export function productBreadcrumbJsonLd(product: Product, origin?: string) {
	return breadcrumbJsonLd(
		[
			{ name: 'Home', path: '/' },
			{ name: 'Crafts', path: '/crafts' },
			{ name: product.name, path: productPath(product) }
		],
		origin
	);
}

export function organizationJsonLd(origin?: string) {
	const siteUrl = origin ?? getSiteUrl();

	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: SITE_NAME,
		url: siteUrl,
		logo: absoluteUrl('/pwa/pwa-512.png', siteUrl),
		email: 'support@selfcrafted.in',
		sameAs: ['https://github.com/TheAnimatrix/SCWeb']
	};
}

export function websiteJsonLd(origin?: string) {
	const siteUrl = origin ?? getSiteUrl();

	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE_NAME,
		url: siteUrl,
		description: DEFAULT_DESCRIPTION,
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${siteUrl}/crafts?q={search_term_string}`
			},
			'query-input': 'required name=search_term_string'
		}
	};
}
