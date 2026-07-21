import type {
	BrowseCatalogResponse,
	GetConstantResponse,
	HomeCatalogResponse,
	ProductDetailResponse,
	ProductRelatedResponse,
	ProductReviewsResponse,
	ProductVariantsResponse
} from '@scweb/api/contracts';
import { mapApiError, type CartApiError, type CartApiResult } from '$lib/client/cartApi';

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
): Promise<CartApiResult<T>> {
	let response: Response;
	try {
		response = await fetchFn(`${apiPrefix}${path}`, init);
	} catch {
		return { ok: false, error: { kind: 'network', message: 'Network error. Please try again.' } };
	}

	const body = await readJson(response);
	if (!response.ok) {
		return { ok: false, error: mapApiError(response.status, body) };
	}

	return { ok: true, data: body as T };
}

export async function getConstant(
	fetchFn: typeof fetch,
	key: string,
	apiPrefix?: string
): Promise<CartApiResult<GetConstantResponse>> {
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
): Promise<CartApiResult<HomeCatalogResponse>> {
	return apiRequest<HomeCatalogResponse>(fetchFn, '/catalog/home', undefined, apiPrefix);
}

export async function getBrowseCatalog(
	fetchFn: typeof fetch,
	searchParams: URLSearchParams,
	apiPrefix?: string
): Promise<CartApiResult<BrowseCatalogResponse>> {
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
): Promise<CartApiResult<ProductDetailResponse>> {
	return apiRequest<ProductDetailResponse>(fetchFn, `/products/${productId}`, undefined, apiPrefix);
}

export async function getProductReviews(
	fetchFn: typeof fetch,
	productId: string,
	apiPrefix?: string
): Promise<CartApiResult<ProductReviewsResponse>> {
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
): Promise<CartApiResult<ProductVariantsResponse>> {
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
): Promise<CartApiResult<ProductRelatedResponse>> {
	return apiRequest<ProductRelatedResponse>(
		fetchFn,
		`/products/${productId}/related`,
		undefined,
		apiPrefix
	);
}

export type CatalogApiError = CartApiError;
