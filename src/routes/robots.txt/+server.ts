import type { RequestHandler } from './$types';
import { getSiteUrl } from '$lib/seo/site';

export const prerender = false;

export const GET: RequestHandler = ({ url }) => {
	const siteUrl = getSiteUrl(url.origin);

	const body = `User-agent: *
Allow: /
Disallow: /cart
Disallow: /checkout
Disallow: /summary
Disallow: /user
Disallow: /3dp-portal/maker
Disallow: /3dp-portal/user
Disallow: /api/

Sitemap: ${siteUrl}/sitemap.xml
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
