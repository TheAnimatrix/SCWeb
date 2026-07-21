import type { Product } from '$lib/types/product';
import {
	absoluteUrl,
	DEFAULT_DESCRIPTION,
	DEFAULT_OG_IMAGE,
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
}

export const homeSeo: SeoMeta = {
	title: SITE_NAME,
	description: DEFAULT_DESCRIPTION,
	type: 'website',
	keywords: [
		'indie hardware',
		'maker marketplace India',
		'electronics makers',
		'local sourcing',
		'3D printing India',
		'Selfcrafted'
	]
};

export const craftsSeo: SeoMeta = {
	title: 'Browse Crafts',
	description:
		'Explore indie hardware products, spares, and flea-market finds from makers across India. Filter by category, price, and tags.',
	type: 'website',
	keywords: ['maker products', 'hardware marketplace', 'indie crafts', 'spares', 'components']
};

export const craftingSeo: SeoMeta = {
	title: 'Start Crafting',
	description:
		'Launch your indie hardware product on Selfcrafted. Prototype, connect with the maker community, list on the marketplace, and scale with local sourcing support.',
	type: 'website'
};

export const portalSeo: SeoMeta = {
	title: '3D Print Portal',
	description:
		'Upload a 3D model, choose material and print settings, and connect with verified makers near you for on-demand 3D printing in India.',
	type: 'website',
	keywords: ['3D printing India', 'on-demand printing', 'maker portal', 'STL printing']
};

export const policySeo: SeoMeta = {
	title: 'Policies & Contact',
	description:
		'Privacy policy, terms, shipping, refunds, and contact information for Selfcrafted India.',
	type: 'website',
	noindex: false
};

export function resolveSeo(meta: SeoMeta = {}, origin?: string): Required<
	Pick<SeoMeta, 'title' | 'description' | 'type' | 'noindex'>
> & {
	canonical: string;
	image: string;
	imageAlt: string;
	imageWidth: number;
	imageHeight: number;
	keywords?: string[];
	price?: number;
	priceCurrency?: string;
} {
	const siteUrl = origin ?? getSiteUrl();
	const title = formatTitle(meta.title === SITE_NAME ? undefined : meta.title);
	const description = meta.description ?? DEFAULT_DESCRIPTION;
	const canonical = meta.canonical ?? siteUrl;
	const image = meta.image ? absoluteUrl(meta.image, siteUrl) : absoluteUrl(DEFAULT_OG_IMAGE, siteUrl);

	return {
		title,
		description,
		canonical,
		image,
		imageAlt: meta.imageAlt ?? SITE_TAGLINE,
		imageWidth: meta.imageWidth ?? 1200,
		imageHeight: meta.imageHeight ?? 630,
		type: meta.type ?? 'website',
		noindex: meta.noindex ?? false,
		keywords: meta.keywords,
		price: meta.price,
		priceCurrency: meta.priceCurrency
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

export function breadcrumbJsonLd(
	items: { name: string; path?: string }[],
	origin?: string
) {
	const siteUrl = origin ?? getSiteUrl();

	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			...(item.path
				? { item: absoluteUrl(item.path, siteUrl) }
				: {})
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
		logo: absoluteUrl(DEFAULT_OG_IMAGE, siteUrl),
		email: 'support@selfcrafted.in',
		sameAs: ['https://github.com/selfcrafted']
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
