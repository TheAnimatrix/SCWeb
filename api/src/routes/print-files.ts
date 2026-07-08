import { Hono } from 'hono';
import { uploadMetadataSchema, printRequestIdParamSchema } from '../contracts/print-files.js';
import { validateParam } from '../lib/validation.js';
import { createLogger } from '../middleware/logging.js';
import { requireAuth } from '../middleware/require-auth.js';
import {
	hasStlExtension,
	isWithinSizeLimit,
	MAX_STL_SIZE_BYTES,
	sanitizeOriginalFilename,
	validateStlContent
} from '../services/print-files.js';
import { isFilesConfigured, type PrintFilesStore } from '../services/print-files-store.js';
import type { AppVariables } from '../types/context.js';

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

async function readBodyWithLimit(
	request: Request,
	maxBytes: number
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; status: 413 | 400 }> {
	const contentLength = request.headers.get('content-length');
	if (contentLength) {
		const length = Number(contentLength);
		if (!Number.isFinite(length) || length <= 0) {
			return { ok: false, status: 400 };
		}
		if (length > maxBytes) {
			return { ok: false, status: 413 };
		}
	}

	const buffer = await request.arrayBuffer();
	if (buffer.byteLength > maxBytes) {
		return { ok: false, status: 413 };
	}

	if (buffer.byteLength === 0) {
		return { ok: false, status: 400 };
	}

	return { ok: true, bytes: new Uint8Array(buffer) };
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
			const form = await c.req.parseBody({ all: true });
			const modelFile = form.model_file;

			if (!(modelFile instanceof File)) {
				return c.json({ error: 'invalid_file', message: 'model_file is required' }, 400);
			}

			if (!isWithinSizeLimit(modelFile.size)) {
				return c.json({ error: 'file_too_large' }, modelFile.size > MAX_STL_SIZE_BYTES ? 413 : 400);
			}

			if (!hasStlExtension(modelFile.name)) {
				return c.json({ error: 'invalid_file_type' }, 415);
			}

			metadataResult = parseUploadMetadata(form as Record<string, FormDataEntryValue>);
			if (!metadataResult.success) {
				return c.json({ error: 'invalid_metadata', issues: metadataResult.error.issues }, 400);
			}

			const arrayBuffer = await modelFile.arrayBuffer();
			if (arrayBuffer.byteLength > MAX_STL_SIZE_BYTES) {
				return c.json({ error: 'file_too_large' }, 413);
			}

			fileBytes = new Uint8Array(arrayBuffer);
			originalFilename = sanitizeOriginalFilename(modelFile.name);
		} else if (isRawUploadRequest(contentType)) {
			const query = c.req.query();
			const filename = query.filename ?? 'model.stl';

			if (!hasStlExtension(filename)) {
				return c.json({ error: 'invalid_file_type' }, 415);
			}

			metadataResult = parseUploadMetadata(query);
			if (!metadataResult.success) {
				return c.json({ error: 'invalid_metadata', issues: metadataResult.error.issues }, 400);
			}

			const bodyResult = await readBodyWithLimit(c.req.raw, MAX_STL_SIZE_BYTES);
			if (!bodyResult.ok) {
				return c.json(
					{ error: bodyResult.status === 413 ? 'file_too_large' : 'invalid_file' },
					bodyResult.status
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
