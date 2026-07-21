import { env } from '$env/dynamic/private';
import { CLIENT_ID_COOKIE_NAME } from '$lib/constants/cookies';
import {
	buildProxyTargetUrl,
	getProxyTimeoutMs,
	isAllowedProxyMethod,
	isAllowedProxyPath,
	isUploadProxyPath
} from '$lib/server/api-proxy';
import { createLogger } from '$lib/server/logger';
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

	headers.set('x-request-id', locals.requestId);

	const clientId = cookies.get(CLIENT_ID_COOKIE_NAME);
	if (clientId) {
		headers.set('cookie', `${CLIENT_ID_COOKIE_NAME}=${clientId}`);
	}

	const { session } = await locals.safeGetSession();
	if (session?.access_token) {
		headers.set('authorization', `Bearer ${session.access_token}`);
	}

	const method = request.method;
	const timeoutMs = getProxyTimeoutMs(params.path);
	const log = createLogger({ requestId: locals.requestId, route: event.route.id ?? undefined });

	let body: BodyInit | undefined;
	let useDuplex = false;

	if (method !== 'GET' && request.body) {
		if (isUploadProxyPath(params.path)) {
			// Buffer uploads so the proxy works reliably to the co-located API (avoids
			// Node fetch streaming issues, especially when API_ORIGIN is misconfigured).
			const buffered = await request.arrayBuffer();
			body = buffered;
			headers.set('content-length', String(buffered.byteLength));
		} else {
			body = request.body;
			useDuplex = true;
		}
	}

	try {
		const response = await fetch(targetUrl, {
			method,
			headers,
			body,
			...(useDuplex ? { duplex: 'half' as const } : {}),
			signal: AbortSignal.timeout(timeoutMs)
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
	} catch (error) {
		log.error('api.proxy.failed', {
			path: params.path,
			target: targetUrl.href,
			error: error instanceof Error ? error.message : String(error)
		});
		return new Response(JSON.stringify({ error: 'api_unreachable' }), {
			status: 502,
			headers: { 'content-type': 'application/json' }
		});
	}
}

export const GET: RequestHandler = (event) => proxyRequest(event);
export const POST: RequestHandler = (event) => proxyRequest(event);
export const PUT: RequestHandler = (event) => proxyRequest(event);
export const PATCH: RequestHandler = (event) => proxyRequest(event);
export const DELETE: RequestHandler = (event) => proxyRequest(event);
