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

export function buildPreviewStorageKey(userId: string, fileId: string): string {
	return `${userId}/${fileId}.png`;
}

export function buildModelPath(storageKey: string): string {
	return `models/${storageKey}`;
}

export function buildPreviewPath(storageKey: string): string {
	return `models/${storageKey}`;
}

export type PrintModelMetadata = {
	fileName: string;
	originalFilename: string;
	previewPath?: string;
	fileSizeBytes?: number;
	dimensions?: { x: number; y: number; z: number };
	triangleCount?: number;
};

export function parsePrintModelMetadata(value: unknown): PrintModelMetadata | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}

	const record = value as Record<string, unknown>;
	const originalFilename =
		typeof record.originalFilename === 'string' ? record.originalFilename.trim() : '';
	const fileName = typeof record.fileName === 'string' ? record.fileName.trim() : '';

	if (!originalFilename && !fileName) {
		return null;
	}

	const dimensions =
		record.dimensions &&
		typeof record.dimensions === 'object' &&
		!Array.isArray(record.dimensions)
			? {
					x: Number((record.dimensions as Record<string, unknown>).x ?? 0),
					y: Number((record.dimensions as Record<string, unknown>).y ?? 0),
					z: Number((record.dimensions as Record<string, unknown>).z ?? 0)
				}
			: undefined;

	return {
		fileName: fileName || originalFilename,
		originalFilename: originalFilename || fileName,
		previewPath: typeof record.previewPath === 'string' ? record.previewPath : undefined,
		fileSizeBytes:
			typeof record.fileSizeBytes === 'number' && Number.isFinite(record.fileSizeBytes)
				? record.fileSizeBytes
				: undefined,
		dimensions,
		triangleCount:
			typeof record.triangleCount === 'number' && Number.isFinite(record.triangleCount)
				? record.triangleCount
				: undefined
	};
}

export function getPrintRequestDisplayName(
	model: string | null | undefined,
	modelMetadata: unknown
): string {
	const metadata = parsePrintModelMetadata(modelMetadata);
	if (metadata?.originalFilename) {
		return metadata.originalFilename;
	}

	if (!model) {
		return 'Model';
	}

	const path = model.split('/').pop() ?? model;
	const segments = path.split('.');
	if (segments.length < 2) {
		return path || 'Model';
	}

	const prefix = segments[segments.length - 2]?.split('_') ?? [];
	return `${prefix[prefix.length - 1] ?? 'model'}.${segments[segments.length - 1]}`;
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
