import { Hono } from 'hono';
import {
	rawUploadQuerySchema,
	uploadMetadataSchema,
	printRequestIdParamSchema
} from '../contracts/print-files.js';
import { validateParam } from '../lib/validation.js';
import { createLogger } from '../middleware/logging.js';
import { requireAuth } from '../middleware/require-auth.js';
import {
	BODY_READ_SLACK_BYTES,
	hasStlExtension,
	isWithinSizeLimit,
	MAX_STL_SIZE_BYTES,
	sanitizeOriginalFilename,
	validateStlContent
} from '../services/print-files.js';
import { isFilesConfigured, type PrintFilesStore } from '../services/print-files-store.js';
import type { AppVariables } from '../types/context.js';

const MAX_BODY_BYTES = MAX_STL_SIZE_BYTES + BODY_READ_SLACK_BYTES;

function isMultipartRequest(contentType: string | undefined): boolean {
	return contentType?.includes('multipart/form-data') ?? false;
}

function isRawUploadRequest(contentType: string | undefined): boolean {
	if (!contentType) {
		return true;
	}

	return (
		contentType.includes('application/octet-stream') ||
		contentType.includes('application/sla') ||
		contentType.includes('model/stl')
	);
}

async function readBoundedBody(
	request: Request,
	maxBytes: number
): Promise<{ ok: true; bytes: Uint8Array<ArrayBuffer> } | { ok: false; status: 413 | 400 }> {
	const contentLength = request.headers.get('content-length');
	if (contentLength !== null) {
		const length = Number(contentLength);
		if (!Number.isFinite(length) || length < 0) {
			return { ok: false, status: 400 };
		}
		if (length > maxBytes) {
			return { ok: false, status: 413 };
		}
	}

	if (!request.body) {
		return { ok: false, status: 400 };
	}

	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			if (!value) {
				continue;
			}

			total += value.byteLength;
			if (total > maxBytes) {
				await reader.cancel();
				return { ok: false, status: 413 };
			}

			chunks.push(value);
		}
	} catch {
		return { ok: false, status: 400 };
	}

	if (total === 0) {
		return { ok: false, status: 400 };
	}

	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return { ok: true, bytes: bytes as Uint8Array<ArrayBuffer> };
}

function parseUploadMetadata(fields: Record<string, FormDataEntryValue | string | undefined>) {
	const parsed = uploadMetadataSchema.safeParse({
		maker_id: String(fields.maker_id ?? ''),
		color: String(fields.color ?? ''),
		material: String(fields.material ?? ''),
		quality: String(fields.quality ?? ''),
		scale: String(fields.scale ?? ''),
		infill: String(fields.infill ?? '')
	});

	return parsed;
}

export function createPrintFilesRoutes(
	getPrintFilesStore: (c: {
		get: (key: 'printFilesStore') => PrintFilesStore | null;
	}) => PrintFilesStore | null
) {
	const printFilesRoutes = new Hono<{ Variables: AppVariables }>();

	printFilesRoutes.post('/print-files/upload', requireAuth(), async (c) => {
		const env = c.get('env');
		const actor = c.get('actor');
		const log = createLogger(c);

		if (!isFilesConfigured(env)) {
			return c.json({ error: 'files_unconfigured' }, 503);
		}

		const store = getPrintFilesStore(c);
		if (!store) {
			return c.json({ error: 'files_unconfigured' }, 503);
		}

		const contentType = c.req.header('content-type');
		let fileBytes: Uint8Array;
		let originalFilename: string;
		let metadataResult: ReturnType<typeof parseUploadMetadata>;

		if (isMultipartRequest(contentType)) {
			const bodyResult = await readBoundedBody(c.req.raw, MAX_BODY_BYTES);
			if (!bodyResult.ok) {
				return c.json(
					{ error: bodyResult.status === 413 ? 'file_too_large' : 'invalid_file' },
					bodyResult.status
				);
			}

			const parsedRequest = new Request(c.req.url, {
				method: 'POST',
				headers: { 'content-type': contentType! },
				body: bodyResult.bytes
			});
			const form = await parsedRequest.formData();
			const modelFile = form.get('model_file');

			if (!(modelFile instanceof File)) {
				return c.json({ error: 'invalid_file', message: 'model_file is required' }, 400);
			}

			if (!hasStlExtension(modelFile.name)) {
				return c.json({ error: 'invalid_file_type' }, 415);
			}

			metadataResult = parseUploadMetadata(Object.fromEntries(form.entries()));
			if (!metadataResult.success) {
				return c.json({ error: 'invalid_metadata', issues: metadataResult.error.issues }, 400);
			}

			const arrayBuffer = await modelFile.arrayBuffer();
			if (!isWithinSizeLimit(arrayBuffer.byteLength)) {
				return c.json(
					{ error: 'file_too_large' },
					arrayBuffer.byteLength > MAX_STL_SIZE_BYTES ? 413 : 400
				);
			}

			fileBytes = new Uint8Array(arrayBuffer);
			originalFilename = sanitizeOriginalFilename(modelFile.name);
		} else if (isRawUploadRequest(contentType)) {
			const queryResult = rawUploadQuerySchema.safeParse(c.req.query());
			if (!queryResult.success) {
				return c.json({ error: 'invalid_metadata', issues: queryResult.error.issues }, 400);
			}

			const { filename = 'model.stl', ...metadata } = queryResult.data;
			metadataResult = { success: true, data: metadata };

			if (!hasStlExtension(filename)) {
				return c.json({ error: 'invalid_file_type' }, 415);
			}

			const bodyResult = await readBoundedBody(c.req.raw, MAX_BODY_BYTES);
			if (!bodyResult.ok) {
				return c.json(
					{ error: bodyResult.status === 413 ? 'file_too_large' : 'invalid_file' },
					bodyResult.status
				);
			}

			if (!isWithinSizeLimit(bodyResult.bytes.byteLength)) {
				return c.json(
					{ error: 'file_too_large' },
					bodyResult.bytes.byteLength > MAX_STL_SIZE_BYTES ? 413 : 400
				);
			}

			fileBytes = bodyResult.bytes;
			originalFilename = sanitizeOriginalFilename(filename);
		} else {
			return c.json({ error: 'unsupported_content_type' }, 415);
		}

		if (!validateStlContent(fileBytes)) {
			return c.json({ error: 'invalid_stl' }, 415);
		}

		const metadata = metadataResult.data;
		const result = await store.uploadPrintFile({
			userId: actor.userId!,
			makerId: metadata.maker_id,
			originalFilename,
			fileBytes,
			modelData: metadata
		});

		if (!result.ok) {
			if (result.status === 429) {
				log.warn('print-files.upload.quota_exceeded', { size: fileBytes.byteLength });
			} else {
				log.error('print-files.upload.failed', { size: fileBytes.byteLength });
			}
			return c.json(result.body, result.status);
		}

		log.info('print-files.upload.completed', {
			printRequestId: result.printRequest.id,
			size: fileBytes.byteLength
		});

		return c.json({ printRequest: result.printRequest });
	});

	printFilesRoutes.get('/print-files/quota', requireAuth(), async (c) => {
		const env = c.get('env');
		const actor = c.get('actor');

		if (!isFilesConfigured(env)) {
			return c.json({ error: 'files_unconfigured' }, 503);
		}

		const store = getPrintFilesStore(c);
		if (!store) {
			return c.json({ error: 'files_unconfigured' }, 503);
		}

		const userId = actor.userId;
		if (!userId) {
			return c.json({ error: 'forbidden' }, 403);
		}

		const quota = await store.getUploadQuotaStatus(userId);
		return c.json(quota);
	});

	printFilesRoutes.get(
		'/print-files/:printRequestId/download-url',
		requireAuth(),
		validateParam(printRequestIdParamSchema),
		async (c) => {
			const env = c.get('env');
			const actor = c.get('actor');
			const log = createLogger(c);

			if (!isFilesConfigured(env)) {
				return c.json({ error: 'files_unconfigured' }, 503);
			}

			const store = getPrintFilesStore(c);
			if (!store) {
				return c.json({ error: 'files_unconfigured' }, 503);
			}

			const { printRequestId } = c.req.valid('param');
			const result = await store.getDownloadUrl(actor.userId!, printRequestId);

			if (!result.ok) {
				log.warn('print-files.download.rejected', {
					printRequestId,
					reason: result.body.error
				});
				return c.json(result.body, result.status);
			}

			log.info('print-files.download.issued', { printRequestId });
			return c.json({ url: result.url, expiresAt: result.expiresAt });
		}
	);

	return printFilesRoutes;
}

export const printFilesRoutes = createPrintFilesRoutes((c) => c.get('printFilesStore'));
