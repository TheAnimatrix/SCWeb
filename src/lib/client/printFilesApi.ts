import type { DownloadUrlResponse } from '@scweb/api/contracts';

export type PrintFilesApiError =
	| { kind: 'file_too_large'; message: string }
	| { kind: 'invalid_file'; message: string }
	| { kind: 'invalid_file_type'; message: string }
	| { kind: 'quota_exceeded'; message: string }
	| { kind: 'files_unconfigured'; message: string }
	| { kind: 'forbidden'; message: string }
	| { kind: 'not_found'; message: string }
	| { kind: 'rate_limited'; message: string }
	| { kind: 'network'; message: string }
	| { kind: 'unknown'; message: string };

export type PrintFilesApiResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: PrintFilesApiError };

type ApiErrorBody = {
	error?: string;
	message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function parseErrorBody(body: unknown): ApiErrorBody {
	if (!isRecord(body)) return {};
	return {
		error: typeof body.error === 'string' ? body.error : undefined,
		message: typeof body.message === 'string' ? body.message : undefined
	};
}

export function mapPrintFilesError(status: number, body: unknown): PrintFilesApiError {
	const parsed = parseErrorBody(body);
	const fallbackMessage = parsed.message ?? 'Something went wrong. Please try again.';

	switch (parsed.error) {
		case 'file_too_large':
			return { kind: 'file_too_large', message: 'Model file must be less than 50MB.' };
		case 'invalid_file':
		case 'invalid_stl':
			return { kind: 'invalid_file', message: 'The uploaded file is not a valid STL model.' };
		case 'invalid_file_type':
			return { kind: 'invalid_file_type', message: 'Only .stl files are allowed.' };
		case 'quota_exceeded':
			return {
				kind: 'quota_exceeded',
				message: 'You have reached your daily quote request limit.'
			};
		case 'files_unconfigured':
			return {
				kind: 'files_unconfigured',
				message: 'File uploads are temporarily unavailable. Please try again later.'
			};
		case 'forbidden':
			return { kind: 'forbidden', message: 'You do not have access to this file.' };
		case 'not_found':
			return { kind: 'not_found', message: 'Print request not found.' };
		case 'rate_limited':
			return { kind: 'rate_limited', message: 'Too many requests. Please wait and try again.' };
		default:
			if (status === 413) {
				return { kind: 'file_too_large', message: 'Model file must be less than 50MB.' };
			}
			if (status === 415) {
				return { kind: 'invalid_file_type', message: 'Only .stl files are allowed.' };
			}
			if (status === 429) {
				return {
					kind: 'quota_exceeded',
					message: 'You have reached your daily quote request limit.'
				};
			}
			if (status === 503) {
				return {
					kind: 'files_unconfigured',
					message: 'File uploads are temporarily unavailable. Please try again later.'
				};
			}
			if (status >= 500) {
				return { kind: 'unknown', message: 'Server error. Please try again.' };
			}
			return { kind: 'unknown', message: fallbackMessage };
	}
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
	init?: RequestInit
): Promise<PrintFilesApiResult<T>> {
	let response: Response;
	try {
		response = await fetchFn(`/api${path}`, init);
	} catch {
		return { ok: false, error: { kind: 'network', message: 'Network error. Please try again.' } };
	}

	const body = await readJson(response);
	if (!response.ok) {
		return { ok: false, error: mapPrintFilesError(response.status, body) };
	}

	return { ok: true, data: body as T };
}

export async function getModelDownloadUrl(
	fetchFn: typeof fetch,
	printRequestId: string
): Promise<PrintFilesApiResult<DownloadUrlResponse>> {
	return apiRequest<DownloadUrlResponse>(fetchFn, `/print-files/${printRequestId}/download-url`);
}

export function triggerSignedUrlDownload(
	url: string,
	filename: string,
	callbacks: {
		onProgress?: (percent: number) => void;
		onComplete?: () => void;
		onError?: (message: string) => void;
	}
): void {
	const xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'blob';
	xhr.onprogress = (event) => {
		if (event.lengthComputable && callbacks.onProgress) {
			callbacks.onProgress(Math.round((event.loaded / event.total) * 100));
		}
	};
	xhr.onload = () => {
		if (xhr.status === 200) {
			const objectUrl = window.URL.createObjectURL(xhr.response);
			const anchor = document.createElement('a');
			anchor.href = objectUrl;
			anchor.download = filename;
			document.body.appendChild(anchor);
			anchor.click();
			setTimeout(() => {
				window.URL.revokeObjectURL(objectUrl);
				document.body.removeChild(anchor);
			}, 100);
			callbacks.onComplete?.();
		} else {
			callbacks.onError?.('Failed to download file');
			callbacks.onComplete?.();
		}
	};
	xhr.onerror = () => {
		callbacks.onError?.('Error downloading model');
		callbacks.onComplete?.();
	};
	xhr.send();
}
