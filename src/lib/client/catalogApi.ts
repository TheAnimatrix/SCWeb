import type {
	BrowseCatalogResponse,
	GetConstantResponse,
	HomeCatalogResponse,
	ProductDetailResponse,
	ProductRelatedResponse,
	ProductReviewsResponse,
	ProductVariantsResponse
} from '@scweb/api/contracts';
import { mapApiError, type CartApiError } from '$lib/client/cartApi';

/**
 * Like `CartApiResult`, but failures carry the HTTP status (0 for a network error)
 * so pages can tell "not found" (404) from "the API is down" (5xx / network).
 */
export type CatalogApiResult<T> =
	{ ok: true; data: T } | { ok: false; error: CartApiError; status: number };

/** True when a failed catalog call means the thing really doesn't exist. */
export function isNotFoundStatus(status: number): boolean {
	return status === 404 || status === 400;
}

async function readJson(response: Response): Promise<unknown> {
	const text = await response.text();
	if (!text) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return null;
	}
}

async function apiRequest<T>(
	fetchFn: typeof fetch,
	path: string,
	init?: RequestInit,
	apiPrefix = '/api'
): Promise<CatalogApiResult<T>> {
	let response: Response;
	try {
		response = await fetchFn(`${apiPrefix}${path}`, init);
	} catch {
		return {
			ok: false,
			error: { kind: 'network', message: 'Network error. Please try again.' },
			status: 0
		};
	}

	const body = await readJson(response);
	if (!response.ok) {
		return { ok: false, error: mapApiError(response.status, body), status: response.status };
	}

	return { ok: true, data: body as T };
}

export async function getConstant(
	fetchFn: typeof fetch,
	key: string,
	apiPrefix?: string
): Promise<CatalogApiResult<GetConstantResponse>> {
	return apiRequest<GetConstantResponse>(
		fetchFn,
		`/constants/${encodeURIComponent(key)}`,
		undefined,
		apiPrefix
	);
}

export async function getHomeCatalog(
	fetchFn: typeof fetch,
	apiPrefix?: string
): Promise<CatalogApiResult<HomeCatalogResponse>> {
	return apiRequest<HomeCatalogResponse>(fetchFn, '/catalog/home', undefined, apiPrefix);
}

export async function getBrowseCatalog(
	fetchFn: typeof fetch,
	searchParams: URLSearchParams,
	apiPrefix?: string
): Promise<CatalogApiResult<BrowseCatalogResponse>> {
	const query = searchParams.toString();
	return apiRequest<BrowseCatalogResponse>(
		fetchFn,
		`/catalog/browse${query ? `?${query}` : ''}`,
		undefined,
		apiPrefix
	);
}

export async function getProduct(
	fetchFn: typeof fetch,
	productId: string,
	apiPrefix?: string
): Promise<CatalogApiResult<ProductDetailResponse>> {
	return apiRequest<ProductDetailResponse>(fetchFn, `/products/${productId}`, undefined, apiPrefix);
}

export async function getProductReviews(
	fetchFn: typeof fetch,
	productId: string,
	apiPrefix?: string
): Promise<CatalogApiResult<ProductReviewsResponse>> {
	return apiRequest<ProductReviewsResponse>(
		fetchFn,
		`/products/${productId}/reviews`,
		undefined,
		apiPrefix
	);
}

export async function getProductVariants(
	fetchFn: typeof fetch,
	productId: string,
	apiPrefix?: string
): Promise<CatalogApiResult<ProductVariantsResponse>> {
	return apiRequest<ProductVariantsResponse>(
		fetchFn,
		`/products/${productId}/variants`,
		undefined,
		apiPrefix
	);
}

export async function getRelatedProducts(
	fetchFn: typeof fetch,
	productId: string,
	apiPrefix?: string
): Promise<CatalogApiResult<ProductRelatedResponse>> {
	return apiRequest<ProductRelatedResponse>(
		fetchFn,
		`/products/${productId}/related`,
		undefined,
		apiPrefix
	);
}

export type CatalogApiError = CartApiError;
