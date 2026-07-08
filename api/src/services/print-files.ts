export const MAX_STL_SIZE_BYTES = 50 * 1024 * 1024;
/** Extra bytes allowed for multipart boundaries/metadata when streaming the request body. */
export const BODY_READ_SLACK_BYTES = 256 * 1024;
export const ASCII_STL_FACET_PREFIX_BYTES = 4 * 1024;
export const DEFAULT_DAILY_QUOTA = 3;
export const SIGNED_URL_EXPIRY_SECONDS = 600;
export const MODELS_BUCKET = 'models';

export type PrintRequestAccess = {
	user_id: string | null;
	creator_id: string | null;
};

export function hasStlExtension(filename: string): boolean {
	return filename.toLowerCase().endsWith('.stl');
}

export function sanitizeOriginalFilename(filename: string): string {
	const basename = filename.split(/[/\\]/).pop() ?? 'model.stl';
	const sanitized = basename.replace(/[^\w.\-() ]+/g, '_').slice(0, 255);
	return sanitized.length > 0 ? sanitized : 'model.stl';
}

export function buildStorageKey(userId: string, fileId: string): string {
	return `${userId}/${fileId}.stl`;
}

export function buildModelPath(storageKey: string): string {
	return `models/${storageKey}`;
}

export function storagePathToBucketKey(modelPath: string): string {
	return modelPath.startsWith('models/') ? modelPath.slice('models/'.length) : modelPath;
}

export function isBinaryStl(data: Uint8Array): boolean {
	if (data.length < 84) {
		return false;
	}

	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const triangleCount = view.getUint32(80, true);
	const expectedSize = 84 + triangleCount * 50;

	return data.length === expectedSize;
}

export function isAsciiStl(data: Uint8Array): boolean {
	if (data.length < 6) {
		return false;
	}

	const headerLen = Math.min(data.length, 80);
	const prefix = new TextDecoder('ascii')
		.decode(data.slice(0, headerLen))
		.trimStart()
		.toLowerCase();
	if (!prefix.startsWith('solid')) {
		return false;
	}

	const facetLen = Math.min(data.length, ASCII_STL_FACET_PREFIX_BYTES);
	const facetPrefix = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(0, facetLen));
	return facetPrefix.includes('facet');
}

export function validateStlContent(data: Uint8Array): boolean {
	if (isBinaryStl(data)) {
		return true;
	}

	return isAsciiStl(data);
}

export function isWithinSizeLimit(size: number, maxBytes = MAX_STL_SIZE_BYTES): boolean {
	return size > 0 && size <= maxBytes;
}

export function isQuotaExceeded(currentCount: number, limit: number): boolean {
	return currentCount >= limit;
}

export function canAccessPrintRequest(
	actorUserId: string,
	printRequest: PrintRequestAccess
): boolean {
	return printRequest.user_id === actorUserId || printRequest.creator_id === actorUserId;
}

export function signedUrlExpiresAt(expiresInSeconds: number, now = Date.now()): string {
	return new Date(now + expiresInSeconds * 1000).toISOString();
}
