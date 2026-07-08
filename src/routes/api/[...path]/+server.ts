import { env } from '$env/dynamic/private';
import { CLIENT_ID_COOKIE_NAME } from '$lib/constants/cookies';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';

const API_ORIGIN = env.API_ORIGIN ?? 'http://localhost:3001';

async function proxyRequest(event: RequestEvent) {
	const { request, params, locals, cookies, url } = event;
	const path = params.path ? `/${params.path}` : '';
	const targetUrl = `${API_ORIGIN}${path}${url.search}`;

	const headers = new Headers();
	const contentType = request.headers.get('content-type');
	if (contentType) {
		headers.set('content-type', contentType);
	}

	const requestId = request.headers.get('x-request-id');
	if (requestId) {
		headers.set('x-request-id', requestId);
	}

	const clientId = cookies.get(CLIENT_ID_COOKIE_NAME);
	if (clientId) {
		headers.set('cookie', `${CLIENT_ID_COOKIE_NAME}=${clientId}`);
	}

	const {
		data: { session }
	} = await locals.supabase.auth.getSession();
	if (session?.access_token) {
		headers.set('authorization', `Bearer ${session.access_token}`);
	}

	const method = request.method;
	const body = method !== 'GET' && method !== 'HEAD' ? await request.arrayBuffer() : undefined;

	const response = await fetch(targetUrl, { method, headers, body });
	const responseContentType = response.headers.get('content-type');
	const responseHeaders = new Headers();
	if (responseContentType) {
		responseHeaders.set('content-type', responseContentType);
	}

	return new Response(response.body, {
		status: response.status,
		headers: responseHeaders
	});
}

export const GET: RequestHandler = (event) => proxyRequest(event);
export const POST: RequestHandler = (event) => proxyRequest(event);
export const PUT: RequestHandler = (event) => proxyRequest(event);
export const DELETE: RequestHandler = (event) => proxyRequest(event);
