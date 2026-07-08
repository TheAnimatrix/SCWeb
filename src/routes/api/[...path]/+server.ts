import { env } from '$env/dynamic/private';
import { CLIENT_ID_COOKIE_NAME } from '$lib/constants/cookies';
import {
	buildProxyTargetUrl,
	isAllowedProxyMethod,
	isAllowedProxyPath
} from '$lib/server/api-proxy';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';

const API_ORIGIN = env.API_ORIGIN ?? 'http://localhost:3001';

async function proxyRequest(event: RequestEvent) {
	const { request, params, locals, cookies, url } = event;

	if (!isAllowedProxyPath(params.path)) {
		return new Response(JSON.stringify({ error: 'not_found' }), {
			status: 404,
			headers: { 'content-type': 'application/json' }
		});
	}

	if (!isAllowedProxyMethod(request.method)) {
		return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
			status: 405,
			headers: { 'content-type': 'application/json' }
		});
	}

	const targetUrl = buildProxyTargetUrl(API_ORIGIN, params.path!, url.search);

	const headers = new Headers();
	const contentType = request.headers.get('content-type');
	if (contentType) {
		headers.set('content-type', contentType);
	}

	const origin = request.headers.get('origin');
	if (origin) {
		headers.set('origin', origin);
	}

	const referer = request.headers.get('referer');
	if (referer) {
		headers.set('referer', referer);
	}

	const requestId = request.headers.get('x-request-id');
	if (requestId) {
		headers.set('x-request-id', requestId);
	}

	const clientId = cookies.get(CLIENT_ID_COOKIE_NAME);
	if (clientId) {
		headers.set('cookie', `${CLIENT_ID_COOKIE_NAME}=${clientId}`);
	}

	const { session } = await locals.safeGetSession();
	if (session?.access_token) {
		headers.set('authorization', `Bearer ${session.access_token}`);
	}

	const method = request.method;
	const body = method !== 'GET' ? await request.arrayBuffer() : undefined;

	try {
		const response = await fetch(targetUrl, {
			method,
			headers,
			body,
			signal: AbortSignal.timeout(10_000)
		});

		const responseContentType = response.headers.get('content-type');
		const responseHeaders = new Headers();
		if (responseContentType) {
			responseHeaders.set('content-type', responseContentType);
		}

		return new Response(response.body, {
			status: response.status,
			headers: responseHeaders
		});
	} catch {
		return new Response(JSON.stringify({ error: 'api_unreachable' }), {
			status: 502,
			headers: { 'content-type': 'application/json' }
		});
	}
}

export const GET: RequestHandler = (event) => proxyRequest(event);
export const POST: RequestHandler = (event) => proxyRequest(event);
export const PUT: RequestHandler = (event) => proxyRequest(event);
export const DELETE: RequestHandler = (event) => proxyRequest(event);
